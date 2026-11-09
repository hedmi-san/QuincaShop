import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import * as orderService from '../services/order.service.js';
import { query, withTransaction, round2 } from '../db/index.js';
import { nextNumber } from '../services/numbering.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// Base guard: ADMIN or ACCOUNTANT
router.use(authenticate, requireRole('ADMIN', 'ACCOUNTANT'));

// GET /admin/orders
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await orderService.getOrders({
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25,
    });

    return res.status(200).json({
      success: true,
      data: result.orders,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /admin/orders/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await orderService.getOrderById(id, undefined, true);
    return sendSuccess(res, order);
  } catch (err: any) {
    if (err instanceof orderService.OrderError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// PATCH /admin/orders/:id/status
const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
  ]),
  note: z.string().optional(),
  visibleToClient: z.boolean().default(true),
  cancelReason: z.string().optional(),
});

router.patch('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parse = updateStatusSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Statut invalide', details: parse.error.issues },
      });
    }

    const updated = await orderService.updateOrderStatus(
      id,
      parse.data.status,
      req.user!.id,
      {
        note: parse.data.note,
        visibleToClient: parse.data.visibleToClient,
        cancelReason: parse.data.cancelReason,
      }
    );

    return sendSuccess(res, updated, `Commande passée au statut ${parse.data.status}`);
  } catch (err: any) {
    if (err instanceof orderService.OrderError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
      });
    }
    return next(err);
  }
});

// POST /admin/orders/:id/cancel
const cancelSchema = z.object({
  cancelReason: z.string().min(3, 'Le motif d’annulation est obligatoire'),
});

router.post('/:id/cancel', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parse = cancelSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Motif requis', details: parse.error.issues },
      });
    }

    const updated = await orderService.updateOrderStatus(
      id,
      'CANCELLED',
      req.user!.id,
      {
        note: parse.data.cancelReason,
        cancelReason: parse.data.cancelReason,
        visibleToClient: true,
      }
    );

    return sendSuccess(res, updated, 'Commande annulée');
  } catch (err: any) {
    if (err instanceof orderService.OrderError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

// POST /admin/orders (Direct counter sales or phone orders placed by staff)
const staffOrderSchema = z.object({
  clientId: z.number().int().positive(),
  paymentMethod: z.enum(['CASH', 'CHECK', 'TRANSFER', 'ON_CREDIT']).default('CASH'),
  fulfillmentType: z.enum(['PICKUP', 'DELIVERY']).default('PICKUP'),
  deliveryAddress: z.string().optional(),
  clientNote: z.string().optional(),
  staffNote: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().nonnegative().optional(), // staff can override price if authorized
    })
  ).min(1, 'La commande doit comporter au moins un article'),
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = staffOrderSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Paramètres invalides', details: parse.error.issues },
      });
    }

    const d = parse.data;

    const order = await withTransaction(async (tx) => {
      // 1. Verify client
      const clRes = await tx.query('SELECT * FROM clients WHERE id = $1', [d.clientId]);
      if (clRes.rows.length === 0) {
        throw new orderService.OrderError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
      }
      const client = clRes.rows[0];

      // 2. Lock stock in sorted order
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

      // 3. Load products
      const pRes = await tx.query('SELECT * FROM products WHERE id = ANY($1)', [productIds]);
      const pMap: Record<number, any> = {};
      for (const p of pRes.rows) {
        pMap[p.id] = p;
      }

      let subtotalHt = 0;
      let totalTva = 0;
      const orderLines: any[] = [];

      for (const item of d.items) {
        const prod = pMap[item.productId];
        if (!prod || !prod.active) {
          throw new orderService.OrderError(`Produit ID ${item.productId} non disponible`, 422, 'PRODUCT_UNAVAILABLE');
        }

        const st = stockMap[item.productId] || { physical_quantity: 0, reserved_quantity: 0 };
        const available = st.physical_quantity - st.reserved_quantity;
        if (available < item.quantity) {
          throw new orderService.OrderError(
            `Stock disponible insuffisant pour ${prod.name} (disponible: ${available}, demandé: ${item.quantity})`,
            422,
            'INSUFFICIENT_STOCK'
          );
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
        });
      }

      subtotalHt = round2(subtotalHt);
      totalTva = round2(totalTva);
      const totalTtc = round2(subtotalHt + totalTva);

      // Check credit limit if paymentMethod is ON_CREDIT
      if (d.paymentMethod === 'ON_CREDIT') {
        const bal = Number(client.current_balance || 0);
        const limit = Number(client.credit_limit || 0);
        if (bal + totalTtc > limit) {
          throw new orderService.OrderError(
            `Dépassement de plafond de crédit (${limit} DZD)`,
            422,
            'CREDIT_LIMIT_EXCEEDED'
          );
        }
      }

      const orderNumber = await nextNumber(tx, 'CMD');

      const oRes = await tx.query(
        `INSERT INTO orders (
          order_number, client_id, status, fulfillment_type, delivery_address,
          delivery_fee, payment_method, subtotal_ht, total_tva, total_ttc,
          client_note, staff_note, channel, created_by
        ) VALUES ($1, $2, 'PENDING', $3, $4, 0, $5, $6, $7, $8, $9, $10, 'STAFF', $11)
        RETURNING *`,
        [
          orderNumber,
          client.id,
          d.fulfillmentType,
          d.deliveryAddress || null,
          d.paymentMethod,
          subtotalHt,
          totalTva,
          totalTtc,
          d.clientNote || null,
          d.staffNote || null,
          req.user!.id,
        ]
      );
      const newOrder = oRes.rows[0];

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
      }

      await tx.query(
        `INSERT INTO order_status_history (order_id, status, note, visible_to_client, changed_by)
         VALUES ($1, 'PENDING', 'Commande créée par le personnel au comptoir', true, $2)`,
        [newOrder.id, req.user!.id]
      );

      return newOrder;
    });

    return sendSuccess(res, order, `Commande ${order.order_number} créée`, 201);
  } catch (err: any) {
    if (err instanceof orderService.OrderError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    return next(err);
  }
});

export default router;

