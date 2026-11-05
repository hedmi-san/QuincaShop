import { query } from '../db/index.js';

export interface CategoryInput {
  name: string;
  slug?: string;
  parent_id?: number | null;
  sort_order?: number;
  active?: boolean;
}

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

export async function getAllCategories(includeInactive = false) {
  const whereClause = includeInactive ? '' : 'WHERE c.active = true';
  const sql = `
    SELECT
      c.id, c.name, c.slug, c.parent_id, c.sort_order, c.active,
      p.name AS parent_name,
      COUNT(prod.id)::int AS products_count
    FROM categories c
    LEFT JOIN categories p ON p.id = c.parent_id
    LEFT JOIN products prod ON prod.category_id = c.id AND prod.active = true
    ${whereClause}
    GROUP BY c.id, p.name
    ORDER BY c.sort_order ASC, c.name ASC
  `;
  const res = await query(sql);
  return res.rows;
}

export async function getCategoryById(id: number) {
  const res = await query(
    `SELECT c.*, p.name AS parent_name
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

export async function createCategory(input: CategoryInput) {
  const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);
  const sortOrder = input.sort_order ?? 0;
  const active = input.active ?? true;

  const res = await query(
    `INSERT INTO categories (name, slug, parent_id, sort_order, active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, slug, parent_id, sort_order, active`,
    [input.name, slug, input.parent_id || null, sortOrder, active]
  );

  return res.rows[0];
}

export async function updateCategory(id: number, input: Partial<CategoryInput>) {
  const current = await getCategoryById(id);
  if (!current) {
    throw new Error('Category not found');
  }

  const name = input.name !== undefined ? input.name : current.name;
  const slug = input.slug !== undefined ? slugify(input.slug) : (input.name !== undefined ? slugify(input.name) : current.slug);
  const parentId = input.parent_id !== undefined ? input.parent_id : current.parent_id;
  const sortOrder = input.sort_order !== undefined ? input.sort_order : current.sort_order;
  const active = input.active !== undefined ? input.active : current.active;

  // Prevent cycle where a category is its own parent
  if (parentId === id) {
    throw new Error('A category cannot be its own parent');
  }

  const res = await query(
    `UPDATE categories
     SET name = $1, slug = $2, parent_id = $3, sort_order = $4, active = $5
     WHERE id = $6
     RETURNING id, name, slug, parent_id, sort_order, active`,
    [name, slug, parentId, sortOrder, active, id]
  );

  return res.rows[0];
}

export async function deleteCategory(id: number) {
  const check = await query('SELECT id FROM categories WHERE id = $1', [id]);
  if (check.rows.length === 0) {
    throw new Error('Category not found');
  }

  // Set child categories parent to null
  await query('UPDATE categories SET parent_id = NULL WHERE parent_id = $1', [id]);
  // Set products category_id to null
  await query('UPDATE products SET category_id = NULL WHERE category_id = $1', [id]);
  // Delete category
  await query('DELETE FROM categories WHERE id = $1', [id]);

  return { deleted: true };
}

