import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { query, withTransaction, round2 } from '../db/index.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// Base guard: ADMIN or ACCOUNTANT
router.use(authenticate, requireRole('ADMIN', 'ACCOUNTANT'));

// GET /admin/stock - Inventory overview with alerts & KPI metrics
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['p.active = true'];
    const values: any[] = [];
    let idx = 1;

    if (req.query.category) {
      conditions.push(`p.category_id = $${idx++}`);
      values.push(parseInt(req.query.category as string, 10));
    }

    if (req.query.search && (req.query.search as string).trim()) {
      const term = `%${(req.query.search as string).trim()}%`;
      conditions.push(`(p.name ILIKE $${idx} OR p.reference ILIKE $${idx} OR p.brand ILIKE $${idx})`);
      values.push(term);
      idx++;
    }

    const stockStatus = req.query.status as string;
    if (stockStatus === 'OUT_OF_STOCK') {
      conditions.push(`COALESCE(s.physical_quantity, 0) <= 0`);
    } else if (stockStatus === 'LOW_STOCK') {
      conditions.push(`COALESCE(s.physical_quantity, 0) > 0 AND (COALESCE(s.physical_quantity, 0) - COALESCE(s.reserved_quantity, 0)) <= p.min_stock_alert`);
    } else if (stockStatus === 'IN_STOCK') {
      conditions.push(`(COALESCE(s.physical_quantity, 0) - COALESCE(s.reserved_quantity, 0)) > p.min_stock_alert`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count for current filter
    const countRes = await query(
      `SELECT COUNT(p.id) as total
       FROM products p
       LEFT JOIN stock s ON s.product_id = p.id
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / pageSize);

    // Summary KPIs (global over all active products)
    const kpiRes = await query(`
      SELECT
        COUNT(p.id) AS total_skus,
        COALESCE(SUM(s.physical_quantity), 0) AS total_units,
        COALESCE(SUM(s.physical_quantity * p.purchase_price), 0) AS total_valuation,
        COUNT(CASE WHEN COALESCE(s.physical_quantity, 0) <= 0 THEN 1 END) AS out_of_stock_count,
        COUNT(CASE WHEN COALESCE(s.physical_quantity, 0) > 0 AND (COALESCE(s.physical_quantity, 0) - COALESCE(s.reserved_quantity, 0)) <= p.min_stock_alert THEN 1 END) AS low_stock_count
      FROM products p
      LEFT JOIN stock s ON s.product_id = p.id
      WHERE p.active = true
    `);

    const kpi = kpiRes.rows[0];
    const isAdmin = req.user?.role === 'ADMIN';

    // Fetch items
    const listSql = `
      SELECT
        p.id, p.reference, p.name, p.brand, p.category_id,
        c.name AS category_name,
        p.unit, p.box_size, p.sale_price,
        ${isAdmin ? 'p.purchase_price,' : '0 AS purchase_price,'}
        p.min_stock_alert,
        COALESCE(s.physical_quantity, 0) AS physical_quantity,
        COALESCE(s.reserved_quantity, 0) AS reserved_quantity,
        (COALESCE(s.physical_quantity, 0) - COALESCE(s.reserved_quantity, 0)) AS available_quantity,
        CASE
          WHEN COALESCE(s.physical_quantity, 0) <= 0 THEN 'OUT_OF_STOCK'
          WHEN (COALESCE(s.physical_quantity, 0) - COALESCE(s.reserved_quantity, 0)) <= p.min_stock_alert THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status,
        (
          SELECT pi.thumb_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC
          LIMIT 1
        ) AS thumb_url
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock s ON s.product_id = p.id
      ${whereClause}
      ORDER BY
        CASE
          WHEN COALESCE(s.physical_quantity, 0) <= 0 THEN 1
          WHEN (COALESCE(s.physical_quantity, 0) - COALESCE(s.reserved_quantity, 0)) <= p.min_stock_alert THEN 2
          ELSE 3
        END,
        p.name ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    values.push(pageSize, offset);
    const itemsRes = await query(listSql, values);

    return res.status(200).json({
      success: true,
      data: itemsRes.rows,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
      kpis: {
        totalSkus: parseInt(kpi.total_skus || '0', 10),
        totalUnits: parseInt(kpi.total_units || '0', 10),
        totalValuation: isAdmin ? round2(Number(kpi.total_valuation || 0)) : null,
        outOfStockCount: parseInt(kpi.out_of_stock_count || '0', 10),
        lowStockCount: parseInt(kpi.low_stock_count || '0', 10),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// POST /admin/stock/adjust - Manual stock adjustment with mandatory reason
const adjustSchema = z.object({
  productId: z.number().int().positive('Identifiant produit invalide'),
  quantityChange: z.number().int().refine((val) => val !== 0, 'La variation de quantité ne peut pas être zéro'),
  reason: z.string().min(3, 'Le motif d’ajustement est obligatoire (au moins 3 caractères)'),
  movementType: z.enum(['ADJUSTMENT', 'PURCHASE', 'RETURN']).default('ADJUSTMENT'),
  notes: z.string().optional(),
});

router.post('/adjust', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parse = adjustSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Données d’ajustement invalides',
          details: parse.error.issues,
        },
      });
    }

    const { productId, quantityChange, reason, movementType, notes } = parse.data;

    const result = await withTransaction(async (tx) => {
      // 1. Lock product and stock
      const pRes = await tx.query('SELECT id, name, reference FROM products WHERE id = $1', [productId]);
      if (pRes.rows.length === 0) {
        throw new Error('Produit introuvable');
      }
      const product = pRes.rows[0];

      let sRes = await tx.query(
        'SELECT product_id, physical_quantity, reserved_quantity FROM stock WHERE product_id = $1 FOR UPDATE',
        [productId]
      );

      if (sRes.rows.length === 0) {
        await tx.query('INSERT INTO stock (product_id, physical_quantity, reserved_quantity) VALUES ($1, 0, 0)', [productId]);
        sRes = await tx.query('SELECT product_id, physical_quantity, reserved_quantity FROM stock WHERE product_id = $1 FOR UPDATE', [productId]);
      }

      const currentStock = sRes.rows[0];
      const curPhysical = Number(currentStock.physical_quantity);
      const curReserved = Number(currentStock.reserved_quantity);
      const newPhysical = curPhysical + quantityChange;

      if (newPhysical < 0) {
        const err: any = new Error(`Stock physique insuffisant. Nouveau stock résultant : ${newPhysical} (négatif interdit).`);
        err.statusCode = 422;
        err.code = 'NEGATIVE_STOCK_NOT_ALLOWED';
        throw err;
      }

      if (newPhysical < curReserved) {
        const err: any = new Error(
          `Impossible de réduire le stock à ${newPhysical} : ${curReserved} unité(s) sont déjà réservées par des commandes en cours.`
        );
        err.statusCode = 422;
        err.code = 'STOCK_BELOW_RESERVED';
        throw err;
      }

      // Update physical stock
      await tx.query(
        'UPDATE stock SET physical_quantity = $1, updated_at = NOW() WHERE product_id = $2',
        [newPhysical, productId]
      );

      // Reference code for audit
      const refCode = `ADJ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const fullNotes = notes ? `${reason} — ${notes}` : reason;

      // Insert immutable movement audit record
      const mRes = await tx.query(
        `INSERT INTO stock_movements (
          product_id, movement_type, quantity_change, reference, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [productId, movementType, quantityChange, refCode, fullNotes, req.user!.id]
      );

      return {
        product,
        previousPhysical: curPhysical,
        newPhysical,
        reserved: curReserved,
        available: newPhysical - curReserved,
        movement: mRes.rows[0],
      };
    });

    return sendSuccess(res, result, 'Ajustement de stock enregistré avec succès');
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

// GET /admin/stock/movements - Paginated movement history
router.get('/movements', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let idx = 1;

    if (req.query.productId) {
      conditions.push(`sm.product_id = $${idx++}`);
      values.push(parseInt(req.query.productId as string, 10));
    }

    if (req.query.movementType) {
      conditions.push(`sm.movement_type = $${idx++}`);
      values.push(req.query.movementType);
    }

    if (req.query.search && (req.query.search as string).trim()) {
      const term = `%${(req.query.search as string).trim()}%`;
      conditions.push(`(p.name ILIKE $${idx} OR p.reference ILIKE $${idx} OR sm.reference ILIKE $${idx} OR sm.notes ILIKE $${idx})`);
      values.push(term);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(
      `SELECT COUNT(sm.id) AS total
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / pageSize);

    const sql = `
      SELECT
        sm.id, sm.product_id, sm.movement_type, sm.quantity_change,
        sm.reference, sm.notes, sm.created_at,
        p.reference AS product_reference, p.name AS product_name, p.unit,
        u.full_name AS created_by_name
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      LEFT JOIN users u ON u.id = sm.created_by
      ${whereClause}
      ORDER BY sm.id DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    values.push(pageSize, offset);
    const movesRes = await query(sql, values);

    return res.status(200).json({
      success: true,
      data: movesRes.rows,
      meta: { page, pageSize, total, totalPages },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

export default router;

