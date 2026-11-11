import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { query, withTransaction, round2 } from '../db/index.js';
import { nextNumber } from '../services/numbering.service.js';
import { recordTransaction } from '../services/ledger.service.js';
import * as factureService from '../services/facture.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// Guard: ADMIN or ACCOUNTANT
router.use(authenticate, requireRole('ADMIN', 'ACCOUNTANT'));

// GET /admin/pos/init - Preload data for POS screen (default client, active clients, categories)
router.get('/init', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Walk-in default client
    const comptoirRes = await query(
      `SELECT id, code, name, phone, address, wilaya, is_default, credit_limit, current_balance
       FROM clients
       WHERE is_default = true OR code = 'CLT-COMPTOIR'
       LIMIT 1`
    );
    const defaultClient = comptoirRes.rows[0] || null;

    // 2. Active approved B2B clients
    const clientsRes = await query(
      `SELECT id, code, name, phone, email, address, wilaya, rc, nif, credit_limit, current_balance, is_default
       FROM clients
       WHERE status = 'ACTIVE' AND is_default = false
       ORDER BY name ASC`
    );

    // 3. Active categories
    const categoriesRes = await query(
      `SELECT id, name, slug FROM categories WHERE active = true ORDER BY sort_order ASC, name ASC`
    );

    return sendSuccess(res, {
      defaultClient,
      clients: clientsRes.rows,
      categories: categoriesRes.rows,
    });
  } catch (err) {
    return next(err);
  }
});

const posSaleSchema = z.object({
  clientId: z.number().int().optional(),
  paymentMethod: z.enum(['CASH', 'CHECK', 'TRANSFER', 'ON_CREDIT']).default('CASH'),
  amountTendered: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  issueFacture: z.boolean().default(false),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().nonnegative().optional(),
    })
  ).min(1, 'Le panier doit contenir au moins un article'),
});

// POST /admin/pos/sale - Atomic in-shop counter sale checkout
router.post('/sale', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = posSaleSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Données de vente invalides',
          details: parse.error.issues,
        },
      });
    }

    const d = parse.data;

    // 1. Transaction to create order, decrement stock, and record payments
    const transactionResult = await withTransaction(async (tx) => {
      // Step A: Determine client
      let client: any = null;
      if (d.clientId && d.clientId > 0) {
        const clRes = await tx.query('SELECT * FROM clients WHERE id = $1 FOR UPDATE', [d.clientId]);
        if (clRes.rows.length === 0) {
          const err: any = new Error('Client introuvable');
          err.statusCode = 404;
          err.code = 'ENTITY_NOT_FOUND';
          throw err;
        }
        client = clRes.rows[0];
      } else {
        const compRes = await tx.query(
          `SELECT * FROM clients WHERE is_default = true OR code = 'CLT-COMPTOIR' LIMIT 1 FOR UPDATE`
        );
        if (compRes.rows.length === 0) {
          const err: any = new Error('Client comptoir introuvable');
          err.statusCode = 404;
          err.code = 'DEFAULT_CLIENT_MISSING';
          throw err;
        }
        client = compRes.rows[0];
      }

      // Step B: Walk-in cannot buy on credit
      if (d.paymentMethod === 'ON_CREDIT' && (client.is_default || client.code === 'CLT-COMPTOIR')) {
        const err: any = new Error('Le client comptoir ne peut pas effectuer d’achats à crédit. Sélectionnez un client B2B agréé.');
        err.statusCode = 422;
        err.code = 'CREDIT_FORBIDDEN_FOR_WALKIN';
        throw err;
      }

      // Step C: Lock products & stock rows in sorted order
      const productIds = d.items.map((i) => i.productId).sort((a, b) => a - b);
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

      const pRes = await tx.query('SELECT * FROM products WHERE id = ANY($1)', [productIds]);
      const pMap: Record<number, any> = {};
      for (const p of pRes.rows) {
        pMap[p.id] = p;
      }

      // Step D: Calculate pricing & verify available inventory
      let subtotalHt = 0;
      let totalTva = 0;
      const orderLines: any[] = [];

      for (const item of d.items) {
        const prod = pMap[item.productId];
        if (!prod || !prod.active) {
          const err: any = new Error(`Produit ID ${item.productId} non disponible`);
          err.statusCode = 422;
          err.code = 'PRODUCT_UNAVAILABLE';
          throw err;
        }

        const st = stockMap[item.productId] || { physical_quantity: 0, reserved_quantity: 0 };
        const available = st.physical_quantity - st.reserved_quantity;

        if (available < item.quantity) {
          const err: any = new Error(
            `Stock disponible insuffisant pour "${prod.name}" (Disponible : ${available}, Demandé : ${item.quantity})`
          );
          err.statusCode = 422;
          err.code = 'INSUFFICIENT_STOCK';
          throw err;
        }

        const priceHt = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(prod.sale_price);
        const lineHt = round2(priceHt * item.quantity);
        const lineTva = round2((lineHt * Number(prod.tva || 19)) / 100);

        subtotalHt += lineHt;
        totalTva += lineTva;

        orderLines.push({
          productId: prod.id,
          name: prod.name,
          reference: prod.reference,
          unit: prod.unit,
          quantity: item.quantity,
          unitPrice: priceHt,
          purchasePriceSnapshot: Number(prod.purchase_price || 0),
          tva: Number(prod.tva || 19),
          lineTotalHt: lineHt,
          lineTotalTtc: lineHt + lineTva,
        });
      }

      subtotalHt = round2(subtotalHt);
      totalTva = round2(totalTva);
      const totalTtc = round2(subtotalHt + totalTva);

      // Step E: Verify credit limit if ON_CREDIT
      if (d.paymentMethod === 'ON_CREDIT') {
        const bal = Number(client.current_balance || 0);
        const limit = Number(client.credit_limit || 0);
        if (bal + totalTtc > limit) {
          const err: any = new Error(
            `Dépassement du plafond de crédit pour ${client.name}. Encours actuel: ${bal} DA, Plafond: ${limit} DA, Montant commande: ${totalTtc} DA`
          );
          err.statusCode = 422;
          err.code = 'CREDIT_LIMIT_EXCEEDED';
          throw err;
        }
      }

      // Step F: Generate Order Number
      const orderNumber = await nextNumber(tx, 'CMD');

      // Step G: Create Order row (status DELIVERED for immediate counter handoff)
      const oRes = await tx.query(
        `INSERT INTO orders (
          order_number, client_id, status, fulfillment_type, delivery_address,
          delivery_fee, payment_method, subtotal_ht, total_tva, total_ttc,
          client_note, staff_note, channel, created_by
        ) VALUES ($1, $2, 'DELIVERED', 'PICKUP', 'Comptoir Magasin', 0, $3, $4, $5, $6, $7, $8, 'STAFF', $9)
        RETURNING *`,
        [
          orderNumber,
          client.id,
          d.paymentMethod,
          subtotalHt,
          totalTva,
          totalTtc,
          null,
          d.notes ? `Vente au comptoir: ${d.notes}` : 'Vente directe au comptoir',
          req.user!.id,
        ]
      );
      const newOrder = oRes.rows[0];

      // Step H: Insert Order Items & decrement physical stock immediately
      for (const line of orderLines) {
        await tx.query(
          `INSERT INTO order_items (
            order_id, product_id, product_name, reference, unit,
            quantity, unit_price, purchase_price_snapshot, tva
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            newOrder.id,
            line.productId,
            line.name,
            line.reference,
            line.unit,
            line.quantity,
            line.unitPrice,
            line.purchasePriceSnapshot,
            line.tva,
          ]
        );

        // Immediate physical stock deduction
        await tx.query(
          `UPDATE stock
           SET physical_quantity = GREATEST(0, physical_quantity - $1), updated_at = NOW()
           WHERE product_id = $2`,
          [line.quantity, line.productId]
        );

        // Log immutable stock movement
        await tx.query(
          `INSERT INTO stock_movements (
            product_id, movement_type, quantity_change, reference, notes, created_by
          ) VALUES ($1, 'SALE', $2, $3, 'Sortie comptoir / Vente directe', $4)`,
          [line.productId, -Math.abs(line.quantity), orderNumber, req.user!.id]
        );
      }

      // Step I: Order Status History
      await tx.query(
        `INSERT INTO order_status_history (order_id, status, note, visible_to_client, changed_by)
         VALUES ($1, 'DELIVERED', 'Vente au comptoir réglée et délivrée au client', true, $2)`,
        [newOrder.id, req.user!.id]
      );

      // Step J: Payment Handling
      let paymentRecord = null;
      let changeAmount = 0;

      if (['CASH', 'CHECK', 'TRANSFER'].includes(d.paymentMethod)) {
        const paymentNumber = await nextNumber(tx, 'PAY');
        const payRes = await tx.query(
          `INSERT INTO client_payments (
            payment_number, client_id, amount, method, reference, payment_date, created_by
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6)
          RETURNING *`,
          [
            paymentNumber,
            client.id,
            totalTtc,
            d.paymentMethod,
            `Encaissement Vente Comptoir ${orderNumber}`,
            req.user!.id,
          ]
        );
        paymentRecord = payRes.rows[0];

        // Link payment to this order
        await tx.query(
          `INSERT INTO payment_allocations (payment_id, order_id, amount) VALUES ($1, $2, $3)`,
          [paymentRecord.id, newOrder.id, totalTtc]
        );

        // If registered client (has account history), balance debit then credit for full transparency
        if (!client.is_default && client.code !== 'CLT-COMPTOIR') {
          await recordTransaction(tx, {
            clientId: client.id,
            type: 'INVOICE',
            referenceType: 'ORDER',
            referenceId: newOrder.id,
            debit: totalTtc,
            credit: 0,
            description: `Vente au comptoir ${orderNumber}`,
            userId: req.user!.id,
          });

          await recordTransaction(tx, {
            clientId: client.id,
            type: 'PAYMENT',
            referenceType: 'PAYMENT',
            referenceId: paymentRecord.id,
            debit: 0,
            credit: totalTtc,
            description: `Règlement comptoir (${d.paymentMethod}) ${orderNumber}`,
            userId: req.user!.id,
          });
        }

        if (d.amountTendered && d.amountTendered > totalTtc) {
          changeAmount = round2(d.amountTendered - totalTtc);
        }
      } else if (d.paymentMethod === 'ON_CREDIT') {
        // Debit client ledger
        await recordTransaction(tx, {
          clientId: client.id,
          type: 'INVOICE',
          referenceType: 'ORDER',
          referenceId: newOrder.id,
          debit: totalTtc,
          credit: 0,
          description: `Vente au comptoir à crédit ${orderNumber}`,
          userId: req.user!.id,
        });
      }

      return {
        order: newOrder,
        client: {
          id: client.id,
          code: client.code,
          name: client.name,
          phone: client.phone,
        },
        items: orderLines,
        payment: {
          method: d.paymentMethod,
          totalTtc,
          amountTendered: d.amountTendered || totalTtc,
          changeAmount,
          paymentRecord,
        },
      };
    });

    // Step K: Optionally generate official Facture immediately
    let facture = null;
    if (d.issueFacture) {
      try {
        facture = await factureService.createFactureFromOrder(
          {
            orderId: transactionResult.order.id,
            docType: 'FACTURE',
            paymentMode: d.paymentMethod,
          },
          req.user!.id
        );
      } catch (fErr) {
        console.warn('⚠️ Could not automatically generate facture for POS sale:', fErr);
      }
    }

    return sendSuccess(
      res,
      {
        ...transactionResult,
        facture,
      },
      `Vente ${transactionResult.order.order_number} validée avec succès`,
      201
    );
  } catch (err: any) {
    if (err.code && err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

export default router;
