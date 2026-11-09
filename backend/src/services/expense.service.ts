import { query, round2 } from '../db/index.js';
import { logAudit } from './audit.service.js';

export class ExpenseError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'EXPENSE_ERROR') {
    super(message);
    this.name = 'ExpenseError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type ExpenseCategory =
  | 'ELECTRICITY'
  | 'WATER'
  | 'RENT'
  | 'FUEL'
  | 'MAINTENANCE'
  | 'TRANSPORTATION'
  | 'SUPPLIES'
  | 'OTHER';

export const VALID_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'ELECTRICITY',
  'WATER',
  'RENT',
  'FUEL',
  'MAINTENANCE',
  'TRANSPORTATION',
  'SUPPLIES',
  'OTHER',
];

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: number;
  description?: string;
  expenseDate: string;
  userId: number;
}

export async function createExpense(input: CreateExpenseInput) {
  if (!VALID_EXPENSE_CATEGORIES.includes(input.category)) {
    throw new ExpenseError(`Catégorie de frais invalide: ${input.category}`, 400, 'INVALID_CATEGORY');
  }

  const amount = round2(Number(input.amount));
  if (isNaN(amount) || amount <= 0) {
    throw new ExpenseError('Le montant de la dépense doit être supérieur à zéro', 400, 'INVALID_AMOUNT');
  }

  const res = await query(
    `INSERT INTO expenses (category, amount, description, expense_date, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.category,
      amount,
      input.description || null,
      new Date(input.expenseDate),
      input.userId,
    ]
  );
  const expense = res.rows[0];

  await logAudit({
    userId: input.userId,
    action: 'EXPENSE_CREATED',
    entityType: 'EXPENSE',
    entityId: expense.id,
    newValues: { category: input.category, amount, description: input.description, date: input.expenseDate },
    description: `Enregistrement d'une dépense de ${amount} DZD (${input.category})`,
  });

  return expense;
}

export async function getExpenses(params: {
  category?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 30));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.category && params.category !== 'ALL') {
    conditions.push(`e.category = $${idx++}`);
    values.push(params.category.toUpperCase());
  }

  if (params.fromDate) {
    conditions.push(`e.expense_date >= $${idx++}`);
    values.push(new Date(params.fromDate));
  }

  if (params.toDate) {
    conditions.push(`e.expense_date <= $${idx++}`);
    values.push(new Date(params.toDate));
  }

  if (params.search && params.search.trim()) {
    conditions.push(`e.description ILIKE $${idx++}`);
    values.push(`%${params.search.trim()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total & sum
  const totalsRes = await query(
    `SELECT
       COUNT(e.id)::int AS total,
       COALESCE(SUM(e.amount), 0)::float AS total_amount
     FROM expenses e
     ${whereClause}`,
    values
  );
  const total = totalsRes.rows[0]?.total || 0;
  const totalAmount = round2(totalsRes.rows[0]?.total_amount || 0);
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Breakdown by category
  const catBreakdown = await query(
    `SELECT e.category, COALESCE(SUM(e.amount), 0)::float AS amount, COUNT(e.id)::int AS count
     FROM expenses e
     ${whereClause}
     GROUP BY e.category
     ORDER BY amount DESC`,
    values
  );

  // Paginated list
  const sql = `
    SELECT e.*, u.full_name AS created_by_name
    FROM expenses e
    LEFT JOIN users u ON u.id = e.created_by
    ${whereClause}
    ORDER BY e.expense_date DESC, e.id DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  values.push(pageSize, offset);
  const res = await query(sql, values);

  return {
    expenses: res.rows,
    summary: {
      totalAmount,
      totalCount: total,
      categories: catBreakdown.rows.map((c: any) => ({
        category: c.category,
        amount: Number(c.amount),
        count: Number(c.count),
      })),
    },
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function getExpenseById(id: number) {
  const res = await query(
    `SELECT e.*, u.full_name AS created_by_name
     FROM expenses e
     LEFT JOIN users u ON u.id = e.created_by
     WHERE e.id = $1`,
    [id]
  );
  if (res.rows.length === 0) {
    throw new ExpenseError('Dépense introuvable', 404, 'ENTITY_NOT_FOUND');
  }
  return res.rows[0];
}

export async function updateExpense(
  id: number,
  data: {
    category?: ExpenseCategory;
    amount?: number;
    description?: string;
    expenseDate?: string;
  },
  userId: number
) {
  const current = await getExpenseById(id);

  const category = data.category || current.category;
  if (!VALID_EXPENSE_CATEGORIES.includes(category)) {
    throw new ExpenseError(`Catégorie invalide: ${category}`, 400, 'INVALID_CATEGORY');
  }

  const amount = data.amount !== undefined ? round2(Number(data.amount)) : Number(current.amount);
  if (amount <= 0) {
    throw new ExpenseError('Le montant doit être supérieur à zéro', 400, 'INVALID_AMOUNT');
  }

  const res = await query(
    `UPDATE expenses
     SET category = $1, amount = $2, description = COALESCE($3, description), expense_date = COALESCE($4, expense_date)
     WHERE id = $5
     RETURNING *`,
    [
      category,
      amount,
      data.description !== undefined ? data.description : current.description,
      data.expenseDate ? new Date(data.expenseDate) : current.expense_date,
      id,
    ]
  );
  const updated = res.rows[0];

  await logAudit({
    userId,
    action: 'EXPENSE_UPDATED',
    entityType: 'EXPENSE',
    entityId: id,
    oldValues: current,
    newValues: updated,
    description: `Modification de la dépense #${id} (${updated.category})`,
  });

  return updated;
}

export async function deleteExpense(id: number, userId: number) {
  const current = await getExpenseById(id);

  await query('DELETE FROM expenses WHERE id = $1', [id]);

  await logAudit({
    userId,
    action: 'EXPENSE_DELETED',
    entityType: 'EXPENSE',
    entityId: id,
    oldValues: current,
    description: `Suppression de la dépense #${id} (${current.amount} DZD - ${current.category})`,
  });

  return { success: true, deletedId: id };
}

