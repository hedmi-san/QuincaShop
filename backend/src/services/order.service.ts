import pg from 'pg';
import { query, withTransaction, round2 } from '../db/index.js';
import { nextNumber } from './numbering.service.js';
import { createNotification } from './notification.service.js';
import { logAudit } from './audit.service.js';

export class OrderError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 400, code = 'ORDER_ERROR', details?: any) {
    super(message);
    this.name = 'OrderError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export type PaymentMethod = 'CASH' | 'CHECK' | 'TRANSFER' | 'ON_CREDIT';
export type FulfillmentType = 'PICKUP' | 'DELIVERY';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'REJECTED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

export async function placeOrder(
  clientId: number,
  userId: number,
  input: {
    fulfillmentType?: FulfillmentType;
    deliveryAddress?: string;
    paymentMethod?: PaymentMethod;
    clientNote?: string;
  }
) {
  const fulfillmentType = input.fulfillmentType || 'PICKUP';
  const paymentMethod = input.paymentMethod || 'ON_CREDIT';

  return withTransaction(async (tx) => {
    // 1. Lock and check client row
    const clientRes = await tx.query(
      'SELECT id, name, email, status, credit_limit, current_balance FROM clients WHERE id = $1 FOR UPDATE',
      [clientId]
    );
    if (clientRes.rows.length === 0) {
      throw new OrderError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
    }
    const client = clientRes.rows[0];
    if (client.status !== 'ACTIVE') {
      throw new OrderError('Le compte client n’est pas actif pour passer commande', 403, 'ACCOUNT_NOT_ACTIVE');
    }

    // 2. Load cart items
    const cartRes = await tx.query(
      `SELECT ci.product_id, ci.quantity, p.name, p.reference, p.unit, p.sale_price, p.purchase_price, p.tva, p.active, p.published, p.min_order_qty
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.client_id = $1`,
      [clientId]
    );

    if (cartRes.rows.length === 0) {
      throw new OrderError('Votre panier est vide', 400, 'EMPTY_CART');
    }

    const cartItems = cartRes.rows;

    // 3. Pessimistic row locking on stock in sorted order to prevent deadlocks
    const productIds = cartItems.map((it: any) => it.product_id).sort((a: number, b: number) => a - b);
    const stockRes = await tx.query(
      `SELECT product_id, physical_quantity, reserved_quantity
       FROM stock
       WHERE product_id = ANY($1)
       ORDER BY product_id FOR UPDATE`,
      [productIds]
    );
    const stockMap: Record<number, { physical_quantity: number; reserved_quantity: number }> = {};
    for (const s of stockRes.rows) {
      stockMap[s.product_id] = {
        physical_quantity: Number(s.physical_quantity),
        reserved_quantity: Number(s.reserved_quantity),
      };
    }

    // 4. Validate stock availability and minimum order quantity
    const insufficientItems: any[] = [];
    let subtotalHt = 0;
    let totalTva = 0;

    for (const item of cartItems) {
      if (!item.active || !item.published) {
        throw new OrderError(`Le produit "${item.name}" n'est plus actif dans le catalogue`, 422, 'PRODUCT_UNAVAILABLE');
      }

      if (item.quantity < (item.min_order_qty || 1)) {
        throw new OrderError(
          `La quantité de "${item.name}" doit être au minimum de ${item.min_order_qty}`,
          400,
          'MIN_ORDER_QTY_NOT_MET'
        );
      }

      const st = stockMap[item.product_id] || { physical_quantity: 0, reserved_quantity: 0 };
      const available = Math.max(0, st.physical_quantity - st.reserved_quantity);

      if (available < item.quantity) {
        insufficientItems.push({
          productId: item.product_id,
          name: item.name,
          reference: item.reference,
          requested: item.quantity,
          available,
        });
      }

      const lineHt = round2(Number(item.sale_price) * item.quantity);
      const lineTva = round2((lineHt * Number(item.tva || 19)) / 100);
      subtotalHt += lineHt;
      totalTva += lineTva;
    }

    if (insufficientItems.length > 0) {
      throw new OrderError(
        'Stock insuffisant pour certains articles de votre panier',
        422,
        'INSUFFICIENT_STOCK',
        { items: insufficientItems }
      );
    }

    subtotalHt = round2(subtotalHt);
    totalTva = round2(totalTva);
    const totalTtc = round2(subtotalHt + totalTva);

    // 5. Check credit limit if paying ON_CREDIT
    if (paymentMethod === 'ON_CREDIT') {
      const currentBalance = Number(client.current_balance || 0);
      const creditLimit = Number(client.credit_limit || 0);
      if (currentBalance + totalTtc > creditLimit) {
        throw new OrderError(
          `Plafond de crédit dépassé. Total commande : ${totalTtc.toLocaleString('fr-FR')} DZD, Crédit disponible : ${Math.max(0, creditLimit - currentBalance).toLocaleString('fr-FR')} DZD`,
          422,
          'CREDIT_LIMIT_EXCEEDED',
          {
            currentBalance,
            creditLimit,
            orderTotal: totalTtc,
            availableCredit: Math.max(0, creditLimit - currentBalance),
          }
        );
      }
    }

    // 6. Generate sequence number (CMD-YYYY-0001)
    const orderNumber = await nextNumber(tx, 'CMD');

    // 7. Insert order
    const orderRes = await tx.query(
      `INSERT INTO orders (
        order_number, client_id, status, fulfillment_type, delivery_address,
        delivery_fee, payment_method, subtotal_ht, total_tva, total_ttc,
        client_note, channel, created_by
      ) VALUES ($1, $2, 'PENDING', $3, $4, 0, $5, $6, $7, $8, $9, 'ONLINE', $10)
      RETURNING *`,
      [
        orderNumber,
        clientId,
        fulfillmentType,
        input.deliveryAddress || null,
        paymentMethod,
        subtotalHt,
        totalTva,
        totalTtc,
        input.clientNote || null,
        userId,
      ]
    );
    const order = orderRes.rows[0];

    // 8. Insert snapshot order items
    for (const it of cartItems) {
      await tx.query(
        `INSERT INTO order_items (
          order_id, product_id, product_name, reference, unit,
          quantity, unit_price, purchase_price_snapshot, tva
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id,
          it.product_id,
          it.name,
          it.reference,
          it.unit,
          it.quantity,
          it.sale_price,
          it.purchase_price || 0,
          it.tva,
        ]
      );
    }

    // 9. Insert initial status history
    await tx.query(
      `INSERT INTO order_status_history (order_id, status, note, visible_to_client, changed_by)
       VALUES ($1, 'PENDING', 'Commande passée en ligne par le client', true, $2)`,
      [order.id, userId]
    );

    // 10. Clear cart
    await tx.query('DELETE FROM cart_items WHERE client_id = $1', [clientId]);

    // 11. Dispatch notifications & audit
    await createNotification(
      {
        roleTarget: 'ADMIN',
        type: 'ORDER_PLACED',
        title: `Nouvelle commande reçue : ${orderNumber}`,
        body: `${client.name} a passé la commande ${orderNumber} d'un montant de ${totalTtc.toLocaleString('fr-FR')} DZD (${paymentMethod}).`,
        link: `/admin/orders/${order.id}`,
      },
      tx
    );

    if (userId) {
      await createNotification(
        {
          userId,
          type: 'ORDER_CONFIRMATION',
          title: `Votre commande ${orderNumber} a été enregistrée`,
          body: `Nous avons bien reçu votre commande d'un montant de ${totalTtc.toLocaleString('fr-FR')} DZD. Elle sera examinée par notre service commercial.`,
          link: `/portal/orders/${order.id}`,
        },
        tx
      );
    }

    await logAudit(
      {
        userId,
        action: 'ORDER_PLACED',
        entityType: 'ORDER',
        entityId: order.id,
        newValues: { orderNumber, totalTtc, paymentMethod, fulfillmentType },
        description: `Création de la commande ${orderNumber} par ${client.name}`,
      },
      tx
    );

    return order;
  });
}

export async function updateOrderStatus(
  orderId: number,
  nextStatus: OrderStatus,
  userId: number,
  options?: {
    note?: string;
    visibleToClient?: boolean;
    cancelReason?: string;
  }
) {
  return withTransaction(async (tx) => {
    // 1. Lock order row
    const orderRes = await tx.query(
      `SELECT o.*, c.name AS client_name, c.user_id AS client_user_id, c.email AS client_email
       FROM orders o
       JOIN clients c ON c.id = o.client_id
       WHERE o.id = $1 FOR UPDATE`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new OrderError('Commande introuvable', 404, 'ENTITY_NOT_FOUND');
    }

    const order = orderRes.rows[0];
    const curStatus = order.status as OrderStatus;

    if (curStatus === nextStatus) {
      return order;
    }

    // Validate state machine transition
    const allowed = ALLOWED_TRANSITIONS[curStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new OrderError(
        `Transition d'état illégale de "${curStatus}" vers "${nextStatus}"`,
        422,
        'INVALID_STATE_TRANSITION',
        { currentStatus: curStatus, targetStatus: nextStatus, allowed }
      );
    }

    // Load order items
    const itemsRes = await tx.query(
      `SELECT product_id, product_name, reference, quantity
       FROM order_items
       WHERE order_id = $1`,
      [orderId]
    );
    const items = itemsRes.rows;

    // Pessimistic row locking on stock in sorted order
    const productIds = items.map((i: any) => i.product_id).sort((a: number, b: number) => a - b);
    let stockMap: Record<number, { physical_quantity: number; reserved_quantity: number }> = {};
    if (productIds.length > 0) {
      const stockRes = await tx.query(
        `SELECT product_id, physical_quantity, reserved_quantity
         FROM stock
         WHERE product_id = ANY($1)
         ORDER BY product_id FOR UPDATE`,
        [productIds]
      );
      for (const s of stockRes.rows) {
        stockMap[s.product_id] = {
          physical_quantity: Number(s.physical_quantity),
          reserved_quantity: Number(s.reserved_quantity),
        };
      }
    }

    // Handle stock effects per state transition
    if (nextStatus === 'CONFIRMED') {
      // Transition -> CONFIRMED: Reserve stock under FOR UPDATE
      const shortfall: any[] = [];
      for (const item of items) {
        const st = stockMap[item.product_id] || { physical_quantity: 0, reserved_quantity: 0 };
        const available = st.physical_quantity - st.reserved_quantity;
        if (available < item.quantity) {
          shortfall.push({
            productId: item.product_id,
            name: item.product_name,
            available,
            requested: item.quantity,
          });
        }
      }

      if (shortfall.length > 0) {
        throw new OrderError(
          'Impossible de confirmer la commande : stock disponible insuffisant pour la réservation',
          422,
          'INSUFFICIENT_STOCK',
          { shortfall }
        );
      }

      // Reserve stock and log movements
      for (const item of items) {
        await tx.query(
          `UPDATE stock
           SET reserved_quantity = reserved_quantity + $1, updated_at = NOW()
           WHERE product_id = $2`,
          [item.quantity, item.product_id]
        );

        await tx.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity_change, reference, notes, created_by)
           VALUES ($1, 'RESERVATION', $2, $3, 'Réservation commande confirmée', $4)`,
          [item.product_id, item.quantity, order.order_number, userId]
        );
      }
    } else if (nextStatus === 'CANCELLED' || nextStatus === 'REJECTED') {
      // If cancelling an order that already held reservations (CONFIRMED, PREPARING, READY), release stock
      if (['CONFIRMED', 'PREPARING', 'READY'].includes(curStatus)) {
        for (const item of items) {
          await tx.query(
            `UPDATE stock
             SET reserved_quantity = GREATEST(0, reserved_quantity - $1), updated_at = NOW()
             WHERE product_id = $2`,
            [item.quantity, item.product_id]
          );

          await tx.query(
            `INSERT INTO stock_movements (product_id, movement_type, quantity_change, reference, notes, created_by)
             VALUES ($1, 'RELEASE', $2, $3, 'Libération réservation (annulation commande)', $4)`,
            [item.product_id, -item.quantity, order.order_number, userId]
          );
        }
      }
    } else if (nextStatus === 'DELIVERED') {
      // Transition READY -> DELIVERED: Commit stock (Sale) -> decrease physical and reserved
      for (const item of items) {
        await tx.query(
          `UPDATE stock
           SET physical_quantity = GREATEST(0, physical_quantity - $1),
               reserved_quantity = GREATEST(0, reserved_quantity - $1),
               updated_at = NOW()
           WHERE product_id = $2`,
          [item.quantity, item.product_id]
        );

        await tx.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity_change, reference, notes, created_by)
           VALUES ($1, 'SALE', $2, $3, 'Sortie stock pour commande livrée', $4)`,
          [item.product_id, -item.quantity, order.order_number, userId]
        );
      }
    }

    // Update order status
    const cancelReason = options?.cancelReason || order.cancel_reason;
    const updRes = await tx.query(
      `UPDATE orders
       SET status = $1, cancel_reason = $2, staff_note = COALESCE($3, staff_note), updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [nextStatus, cancelReason || null, options?.note || null, orderId]
    );
    const updatedOrder = updRes.rows[0];

    // Record order status history
    const visibleToClient = options?.visibleToClient !== undefined ? options.visibleToClient : true;
    await tx.query(
      `INSERT INTO order_status_history (order_id, status, note, visible_to_client, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, nextStatus, options?.note || `Statut mis à jour vers ${nextStatus}`, visibleToClient, userId]
    );

    // Notify client if visible
    if (order.client_user_id && visibleToClient) {
      await createNotification(
        {
          userId: order.client_user_id,
          type: `ORDER_${nextStatus}`,
          title: `Commande ${order.order_number} : ${statusFrenchLabel(nextStatus)}`,
          body: options?.note || `Votre commande ${order.order_number} est désormais à l'état "${statusFrenchLabel(nextStatus)}".`,
          link: `/portal/orders/${order.id}`,
          emailRecipient: order.client_email,
        },
        tx
      );
    }

    await logAudit(
      {
        userId,
        action: 'ORDER_STATUS_CHANGED',
        entityType: 'ORDER',
        entityId: orderId,
        oldValues: { status: curStatus },
        newValues: { status: nextStatus, note: options?.note },
        description: `Transition de la commande ${order.order_number} de ${curStatus} vers ${nextStatus}`,
      },
      tx
    );

    return updatedOrder;
  });
}

export async function cancelOrderByClient(orderId: number, clientId: number, userId: number, reason?: string) {
  const res = await query('SELECT id, status, client_id FROM orders WHERE id = $1 AND client_id = $2', [orderId, clientId]);
  if (res.rows.length === 0) {
    throw new OrderError('Commande introuvable', 404, 'ENTITY_NOT_FOUND');
  }
  const order = res.rows[0];
  if (order.status !== 'PENDING') {
    throw new OrderError(
      'Seules les commandes en attente (PENDING) peuvent être annulées par le client',
      400,
      'CANNOT_CANCEL_NON_PENDING'
    );
  }

  return updateOrderStatus(orderId, 'CANCELLED', userId, {
    note: reason || 'Annulée par le client',
    cancelReason: reason || 'Annulation client',
    visibleToClient: true,
  });
}

export async function getOrders(params: {
  clientId?: number;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.clientId) {
    conditions.push(`o.client_id = $${idx++}`);
    values.push(params.clientId);
  }

  if (params.status && params.status !== 'ALL') {
    conditions.push(`o.status = $${idx++}`);
    values.push(params.status.toUpperCase());
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(`(o.order_number ILIKE $${idx} OR c.name ILIKE $${idx} OR COALESCE(c.code,'') ILIKE $${idx})`);
    values.push(term);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(o.id)::int AS total
     FROM orders o
     JOIN clients c ON c.id = o.client_id
     ${whereClause}`,
    values
  );
  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const sql = `
    SELECT
      o.*,
      c.code AS client_code,
      c.name AS client_name,
      c.phone AS client_phone,
      c.wilaya AS client_wilaya,
      (SELECT COUNT(oi.id)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count
    FROM orders o
    JOIN clients c ON c.id = o.client_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;

  values.push(pageSize, offset);
  const res = await query(sql, values);

  return {
    orders: res.rows,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function getOrderById(orderId: number, clientId?: number, isStaff = false) {
  let condition = 'o.id = $1';
  const params: any[] = [orderId];
  if (clientId && !isStaff) {
    condition += ' AND o.client_id = $2';
    params.push(clientId);
  }

  const orderRes = await query(
    `SELECT
      o.*,
      c.code AS client_code,
      c.name AS client_name,
      c.contact_person AS client_contact_person,
      c.phone AS client_phone,
      c.email AS client_email,
      c.address AS client_address,
      c.wilaya AS client_wilaya,
      c.rc AS client_rc,
      c.nif AS client_nif,
      c.current_balance AS client_current_balance,
      c.credit_limit AS client_credit_limit
     FROM orders o
     JOIN clients c ON c.id = o.client_id
     WHERE ${condition}`,
    params
  );

  if (orderRes.rows.length === 0) {
    throw new OrderError('Commande introuvable', 404, 'ENTITY_NOT_FOUND');
  }

  const order = orderRes.rows[0];

  // Load items
  const itemsRes = await query(
    `SELECT
      oi.*,
      (
        SELECT pi.thumb_url
        FROM product_images pi
        WHERE pi.product_id = oi.product_id
        ORDER BY pi.is_primary DESC, pi.sort_order ASC
        LIMIT 1
      ) AS thumb_url
     FROM order_items oi
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`,
    [orderId]
  );

  // Load status history (clients only see visible_to_client = true)
  const historyCondition = isStaff ? '' : 'AND osh.visible_to_client = true';
  const historyRes = await query(
    `SELECT osh.*, u.full_name AS changed_by_name
     FROM order_status_history osh
     LEFT JOIN users u ON u.id = osh.changed_by
     WHERE osh.order_id = $1 ${historyCondition}
     ORDER BY osh.created_at ASC`,
    [orderId]
  );

  return {
    ...order,
    items: itemsRes.rows,
    history: historyRes.rows,
  };
}

function statusFrenchLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'En Attente de Confirmation';
    case 'CONFIRMED': return 'Confirmée (Stock Réservé)';
    case 'PREPARING': return 'En Préparation en Magasin';
    case 'READY': return 'Prête pour Retrait / Expédition';
    case 'DELIVERED': return 'Livrée / Remise';
    case 'COMPLETED': return 'Clôturée';
    case 'CANCELLED': return 'Annulée';
    case 'REJECTED': return 'Refusée';
    default: return status;
  }
}
