import { query } from '../db/index.js';
import { serializeProduct, ProductRow } from './serializer.service.js';
import { UserContext } from '../types/index.js';

export async function getCategories() {
  const res = await query(
    `SELECT id, name, slug, parent_id, sort_order
     FROM categories
     WHERE active = true
     ORDER BY sort_order ASC, name ASC`
  );
  return res.rows;
}

export async function getStoreInfo() {
  const res = await query("SELECT value FROM settings WHERE key = 'company'");
  if (res.rows.length === 0) {
    return null;
  }
  return res.rows[0].value;
}

export async function getPublicProducts(
  params: {
    category?: string;
    search?: string;
    brand?: string;
    page?: number;
    pageSize?: number;
  },
  user?: UserContext | null
) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 24));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['p.active = true', 'p.published = true'];
  const values: any[] = [];
  let paramIndex = 1;

  // Filter by category (slug or id)
  if (params.category) {
    if (/^\d+$/.test(params.category)) {
      conditions.push(`p.category_id = $${paramIndex++}`);
      values.push(parseInt(params.category, 10));
    } else {
      conditions.push(`c.slug = $${paramIndex++}`);
      values.push(params.category);
    }
  }

  // Filter by brand
  if (params.brand) {
    conditions.push(`p.brand ILIKE $${paramIndex++}`);
    values.push(params.brand);
  }

  // Filter by search (name, reference, brand using trigram or ILIKE)
  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(`(p.name ILIKE $${paramIndex} OR p.reference ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex})`);
    values.push(term);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countSql = `
    SELECT COUNT(p.id) AS total
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ${whereClause}
  `;
  const countRes = await query(countSql, values);
  const total = parseInt(countRes.rows[0]?.total || '0', 10);
  const totalPages = Math.ceil(total / pageSize);

  // Fetch paginated products with stock & images
  const selectSql = `
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
    ORDER BY p.name ASC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  values.push(pageSize, offset);
  const productsRes = await query(selectSql, values);

  const serialized = productsRes.rows.map((row: any) => {
    const images = Array.isArray(row.images) ? row.images : [];
    const primary = images.find((i: any) => i.is_primary) || images[0];
    const productRow: ProductRow = {
      ...row,
      images,
      primary_image: primary?.url || null,
    };
    return serializeProduct(productRow, user, true);
  });

  return {
    products: serialized,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function getProductBySlugOrId(identifier: string, user?: UserContext | null) {
  const isNumeric = /^\d+$/.test(identifier);
  const condition = isNumeric ? 'p.id = $1' : 'p.slug = $1';
  const paramVal = isNumeric ? parseInt(identifier, 10) : identifier;

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
    WHERE ${condition} AND p.active = true AND p.published = true
    GROUP BY p.id, c.name, s.physical_quantity, s.reserved_quantity
  `;

  const res = await query(sql, [paramVal]);
  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  const images = Array.isArray(row.images) ? row.images : [];
  const primary = images.find((i: any) => i.is_primary) || images[0];
  const productRow: ProductRow = {
    ...row,
    images,
    primary_image: primary?.url || null,
  };

  return serializeProduct(productRow, user, true);
}

