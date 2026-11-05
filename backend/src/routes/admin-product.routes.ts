import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { query, withTransaction } from '../db/index.js';
import { serializeProduct, ProductRow } from '../services/serializer.service.js';
import { upload, processAndSaveProductImage, deleteProductImage, setPrimaryProductImage } from '../services/image.service.js';
import { sendSuccess } from '../common/response.js';

const router = Router();

// Base guard: all admin product routes require ADMIN or ACCOUNTANT
router.use(authenticate, requireRole('ADMIN', 'ACCOUNTANT'));

const productSchema = z.object({
  reference: z.string().min(2, 'Reference is required'),
  name: z.string().min(2, 'Product name is required'),
  slug: z.string().optional(),
  brand: z.string().nullable().optional(),
  category_id: z.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
  specs: z.any().optional(),
  purchase_price: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative('Sale price must be positive or zero'),
  facture_price: z.number().nonnegative().nullable().optional(),
  min_order_qty: z.number().int().positive().default(1),
  min_stock_alert: z.number().int().nonnegative().default(1),
  unit: z.string().default('PIECE'),
  box_size: z.number().int().nonnegative().default(0),
  tva: z.number().default(19.00),
  published: z.boolean().default(true),
  initial_stock: z.number().int().nonnegative().optional(),
});

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// GET /admin/products
router.get('/', async (req: AuthRequest, res: Response, next) => {
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

    if (req.query.brand) {
      conditions.push(`p.brand ILIKE $${idx++}`);
      values.push(req.query.brand);
    }

    if (req.query.search && (req.query.search as string).trim()) {
      const term = `%${(req.query.search as string).trim()}%`;
      conditions.push(`(p.name ILIKE $${idx} OR p.reference ILIKE $${idx} OR p.brand ILIKE $${idx})`);
      values.push(term);
      idx++;
    }

    if (req.query.published !== undefined) {
      conditions.push(`p.published = $${idx++}`);
      values.push(req.query.published === 'true');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total count
    const countRes = await query(`SELECT COUNT(p.id) as total FROM products p ${whereClause}`, values);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / pageSize);

    // Products list
    const sql = `
      SELECT
        p.id, p.reference, p.name, p.slug, p.brand, p.category_id,
        c.name AS category_name,
        p.description, p.specs, p.purchase_price, p.sale_price, p.facture_price,
        p.min_order_qty, p.min_stock_alert, p.unit, p.box_size, p.tva,
        p.published, p.active,
        COALESCE(s.physical_quantity, 0) AS physical_quantity,
        COALESCE(s.reserved_quantity, 0) AS reserved_quantity,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.url,
              'thumb_url', pi.thumb_url,
              'alt', pi.alt,
              'is_primary', pi.is_primary,
              'sort_order', pi.sort_order
            ) ORDER BY pi.is_primary DESC, pi.sort_order ASC
          ) FILTER (WHERE pi.id IS NOT NULL), '[]'::json
        ) AS images
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock s ON s.product_id = p.id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      ${whereClause}
      GROUP BY p.id, c.name, s.physical_quantity, s.reserved_quantity
      ORDER BY p.id DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    values.push(pageSize, offset);
    const productsRes = await query(sql, values);

    const serialized = productsRes.rows.map((row: any) => {
      const images = Array.isArray(row.images) ? row.images : [];
      const primary = images.find((i: any) => i.is_primary) || images[0];
      const productRow: ProductRow = {
        ...row,
        images,
        primary_image: primary?.url || null,
      };
      return serializeProduct(productRow, req.user);
    });

    return res.status(200).json({
      success: true,
      data: serialized,
      meta: { page, pageSize, total, totalPages },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /admin/products/:id
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sql = `
      SELECT
        p.id, p.reference, p.name, p.slug, p.brand, p.category_id,
        c.name AS category_name,
        p.description, p.specs, p.purchase_price, p.sale_price, p.facture_price,
        p.min_order_qty, p.min_stock_alert, p.unit, p.box_size, p.tva,
        p.published, p.active,
        COALESCE(s.physical_quantity, 0) AS physical_quantity,
        COALESCE(s.reserved_quantity, 0) AS reserved_quantity,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.url,
              'thumb_url', pi.thumb_url,
              'alt', pi.alt,
              'is_primary', pi.is_primary,
              'sort_order', pi.sort_order
            ) ORDER BY pi.is_primary DESC, pi.sort_order ASC
          ) FILTER (WHERE pi.id IS NOT NULL), '[]'::json
        ) AS images
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock s ON s.product_id = p.id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.name, s.physical_quantity, s.reserved_quantity
    `;

    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Product not found' } });
    }

    const row = result.rows[0];
    const images = Array.isArray(row.images) ? row.images : [];
    const primary = images.find((i: any) => i.is_primary) || images[0];
    const productRow: ProductRow = {
      ...row,
      images,
      primary_image: primary?.url || null,
    };

    return sendSuccess(res, serializeProduct(productRow, req.user));
  } catch (err) {
    return next(err);
  }
});

// POST /admin/products (Admin only)
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const parse = productSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid product parameters',
          details: parse.error.issues,
        },
      });
    }

    const d = parse.data;
    const slug = d.slug?.trim() ? slugify(d.slug) : slugify(`${d.name}-${d.reference}`);

    const result = await withTransaction(async (client) => {
      // 1. Insert product
      const pRes = await client.query(
        `INSERT INTO products (
          reference, name, slug, brand, category_id, description, specs,
          purchase_price, sale_price, facture_price, min_order_qty, min_stock_alert,
          unit, box_size, tva, published, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
        RETURNING *`,
        [
          d.reference,
          d.name,
          slug,
          d.brand || null,
          d.category_id || null,
          d.description || null,
          d.specs ? JSON.stringify(d.specs) : null,
          d.purchase_price || 0,
          d.sale_price,
          d.facture_price || d.sale_price,
          d.min_order_qty,
          d.min_stock_alert,
          d.unit,
          d.box_size,
          d.tva,
          d.published,
        ]
      );
      const newProduct = pRes.rows[0];

      // 2. Initialize stock entry
      const initialStock = d.initial_stock || 0;
      await client.query(
        `INSERT INTO stock (product_id, physical_quantity, reserved_quantity)
         VALUES ($1, $2, 0)`,
        [newProduct.id, initialStock]
      );

      if (initialStock > 0) {
        await client.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity_change, reference, notes, created_by)
           VALUES ($1, 'INITIAL', $2, 'INIT-STOCK', 'Initial stock setup on product creation', $3)`,
          [newProduct.id, initialStock, req.user?.id]
        );
      }

      return newProduct;
    });

    return sendSuccess(res, result, 'Product created successfully', 201);
  } catch (err: any) {
    if (err.code === '23505') { // Unique constraint violation (reference or slug)
      return res.status(409).json({
        success: false,
        error: {
          code: 'REFERENCE_ALREADY_EXISTS',
          message: 'A product with this reference or slug already exists',
        },
      });
    }
    return next(err);
  }
});

// PUT /admin/products/:id (Admin and Accountant, but Accountant cannot edit purchase_price)
router.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parse = productSchema.partial().safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid product update parameters',
          details: parse.error.issues,
        },
      });
    }

    const currentRes = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Product not found' } });
    }

    const cur = currentRes.rows[0];
    const d = parse.data;

    // Accountant is strictly forbidden from changing purchase_price
    let purchasePrice = cur.purchase_price;
    if (req.user?.role === 'ADMIN' && d.purchase_price !== undefined) {
      purchasePrice = d.purchase_price;
    }

    const name = d.name !== undefined ? d.name : cur.name;
    const reference = d.reference !== undefined ? d.reference : cur.reference;
    const slug = d.slug !== undefined ? slugify(d.slug) : (d.name !== undefined ? slugify(`${name}-${reference}`) : cur.slug);

    const updateRes = await query(
      `UPDATE products SET
        reference = $1, name = $2, slug = $3, brand = $4, category_id = $5,
        description = $6, specs = $7, purchase_price = $8, sale_price = $9,
        facture_price = $10, min_order_qty = $11, min_stock_alert = $12,
        unit = $13, box_size = $14, tva = $15, published = $16, updated_at = NOW()
      WHERE id = $17
      RETURNING *`,
      [
        reference,
        name,
        slug,
        d.brand !== undefined ? d.brand : cur.brand,
        d.category_id !== undefined ? d.category_id : cur.category_id,
        d.description !== undefined ? d.description : cur.description,
        d.specs !== undefined ? (d.specs ? JSON.stringify(d.specs) : null) : cur.specs,
        purchasePrice,
        d.sale_price !== undefined ? d.sale_price : cur.sale_price,
        d.facture_price !== undefined ? d.facture_price : cur.facture_price,
        d.min_order_qty !== undefined ? d.min_order_qty : cur.min_order_qty,
        d.min_stock_alert !== undefined ? d.min_stock_alert : cur.min_stock_alert,
        d.unit !== undefined ? d.unit : cur.unit,
        d.box_size !== undefined ? d.box_size : cur.box_size,
        d.tva !== undefined ? d.tva : cur.tva,
        d.published !== undefined ? d.published : cur.published,
        id,
      ]
    );

    return sendSuccess(res, updateRes.rows[0], 'Product updated successfully');
  } catch (err) {
    return next(err);
  }
});

// PATCH /admin/products/:id/publish (Toggle published status)
router.patch('/:id/publish', async (req: AuthRequest, res: Response, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await query(
      'UPDATE products SET published = NOT published, updated_at = NOW() WHERE id = $1 RETURNING id, published',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Product not found' } });
    }

    return sendSuccess(res, result.rows[0], `Product storefront visibility toggled to ${result.rows[0].published}`);
  } catch (err) {
    return next(err);
  }
});

// DELETE /admin/products/:id (Soft delete: active = false)
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await query(
      'UPDATE products SET active = false, updated_at = NOW() WHERE id = $1 RETURNING id, active',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'ENTITY_NOT_FOUND', message: 'Product not found' } });
    }

    return sendSuccess(res, result.rows[0], 'Product archived successfully');
  } catch (err) {
    return next(err);
  }
});

// POST /admin/products/:id/images (Upload image)
router.post('/:id/images', upload.single('image'), async (req: AuthRequest, res: Response, next) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FILE', message: 'An image file must be uploaded' },
      });
    }

    const savedImage = await processAndSaveProductImage(
      productId,
      req.file.buffer,
      req.body.alt
    );

    return sendSuccess(res, savedImage, 'Image processed and uploaded successfully', 201);
  } catch (err) {
    return next(err);
  }
});

// DELETE /admin/products/images/:imageId (Delete image)
router.delete('/images/:imageId', requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const imageId = parseInt(req.params.imageId, 10);
    const result = await deleteProductImage(imageId);
    return sendSuccess(res, result, 'Image deleted successfully');
  } catch (err) {
    return next(err);
  }
});

// POST /admin/products/images/:imageId/set-primary (Set primary image)
router.post('/images/:imageId/set-primary', async (req: AuthRequest, res: Response, next) => {
  try {
    const imageId = parseInt(req.params.imageId, 10);
    const result = await setPrimaryProductImage(imageId);
    return sendSuccess(res, result, 'Primary image updated successfully');
  } catch (err) {
    return next(err);
  }
});

export default router;

