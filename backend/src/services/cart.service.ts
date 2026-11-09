import { query } from '../db/index.js';
import { round2 } from '../db/index.js';

export class CartError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'CART_ERROR') {
    super(message);
    this.name = 'CartError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function getCart(clientId: number) {
  const sql = `
    SELECT
      ci.id AS cart_item_id,
      ci.client_id,
      ci.product_id,
      ci.quantity,
      ci.updated_at,
      p.reference,
      p.name,
      p.slug,
      p.brand,
      p.unit,
      p.box_size,
      p.sale_price,
      p.tva,
      p.min_order_qty,
      p.active,
      p.published,
      COALESCE(s.physical_quantity, 0) AS physical_quantity,
      COALESCE(s.reserved_quantity, 0) AS reserved_quantity,
      (COALESCE(s.physical_quantity, 0) - COALESCE(s.reserved_quantity, 0)) AS available_quantity,
      (
        SELECT pi.thumb_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.sort_order ASC
        LIMIT 1
      ) AS thumb_url
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN stock s ON s.product_id = p.id
    WHERE ci.client_id = $1
    ORDER BY ci.updated_at DESC
  `;

  const res = await query(sql, [clientId]);

  let subtotalHt = 0;
  let totalTva = 0;
  let hasStockIssue = false;

  const items = res.rows.map((row: any) => {
    const qty = Number(row.quantity);
    const unitPrice = Number(row.sale_price);
    const tvaRate = Number(row.tva || 19.0);
    const lineHt = round2(unitPrice * qty);
    const lineTva = round2((lineHt * tvaRate) / 100);
    const lineTtc = round2(lineHt + lineTva);
    const available = Number(row.available_quantity || 0);
    const isAvailable = available >= qty && row.active && row.published;

    if (!isAvailable) {
      hasStockIssue = true;
    }

    subtotalHt += lineHt;
    totalTva += lineTva;

    return {
      cartItemId: row.cart_item_id,
      productId: row.product_id,
      reference: row.reference,
      name: row.name,
      slug: row.slug,
      brand: row.brand,
      unit: row.unit,
      boxSize: row.box_size,
      thumbUrl: row.thumb_url,
      quantity: qty,
      minOrderQty: row.min_order_qty,
      unitPrice,
      tvaRate,
      lineHt,
      lineTva,
      lineTtc,
      availableQuantity: available,
      isAvailable,
      active: row.active,
      published: row.published,
    };
  });

  subtotalHt = round2(subtotalHt);
  totalTva = round2(totalTva);
  const totalTtc = round2(subtotalHt + totalTva);

  return {
    items,
    summary: {
      subtotalHt,
      totalTva,
      totalTtc,
      itemCount: items.length,
      totalQuantity: items.reduce((acc, it) => acc + it.quantity, 0),
      hasStockIssue,
    },
  };
}

export async function upsertCartItem(clientId: number, productId: number, quantity: number) {
  if (quantity <= 0) {
    return removeCartItem(clientId, productId);
  }

  // Check product validity
  const prodRes = await query(
    `SELECT id, name, min_order_qty, active, published
     FROM products
     WHERE id = $1`,
    [productId]
  );

  if (prodRes.rows.length === 0 || !prodRes.rows[0].active || !prodRes.rows[0].published) {
    throw new CartError('Ce produit n’est plus disponible à la commande', 404, 'PRODUCT_UNAVAILABLE');
  }

  const prod = prodRes.rows[0];
  const minQty = prod.min_order_qty || 1;

  if (quantity < minQty) {
    throw new CartError(
      `La quantité minimale pour cet article est de ${minQty} unité(s)`,
      400,
      'MIN_ORDER_QTY_NOT_MET'
    );
  }

  await query(
    `INSERT INTO cart_items (client_id, product_id, quantity, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (client_id, product_id)
     DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
    [clientId, productId, quantity]
  );

  return getCart(clientId);
}

export async function removeCartItem(clientId: number, productId: number) {
  await query('DELETE FROM cart_items WHERE client_id = $1 AND product_id = $2', [clientId, productId]);
  return getCart(clientId);
}

export async function clearCart(clientId: number) {
  await query('DELETE FROM cart_items WHERE client_id = $1', [clientId]);
  return { cleared: true };
}

