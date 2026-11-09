import pg from 'pg';
import { query, round2 } from '../db/index.js';

export class LedgerError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'LEDGER_ERROR') {
    super(message);
    this.name = 'LedgerError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type TransactionType = 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'REFUND' | 'ADJUSTMENT';

export interface RecordTransactionInput {
  clientId: number;
  type: TransactionType;
  referenceType?: string;
  referenceId?: number;
  debit: number;
  credit: number;
  description: string;
  userId: number;
  transactionDate?: Date;
}

/**
 * Appends an immutable transaction into `client_transactions` and updates `clients.current_balance`.
 * MUST be executed inside an active PostgreSQL transaction (PoolClient) to ensure consistency.
 */
export async function recordTransaction(
  tx: pg.PoolClient,
  input: RecordTransactionInput
) {
  const debit = round2(Math.max(0, Number(input.debit) || 0));
  const credit = round2(Math.max(0, Number(input.credit) || 0));

  if (debit > 0 && credit > 0) {
    throw new LedgerError('Une écriture ne peut pas comporter simultanément un débit et un crédit positifs', 400, 'INVALID_LEDGER_AMOUNTS');
  }

  // 1. Lock client row
  const clRes = await tx.query(
    'SELECT id, name, current_balance, credit_limit FROM clients WHERE id = $1 FOR UPDATE',
    [input.clientId]
  );
  if (clRes.rows.length === 0) {
    throw new LedgerError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
  }
  const client = clRes.rows[0];

  const prevBalance = Number(client.current_balance || 0);
  const newBalance = round2(prevBalance + debit - credit);

  // 2. Insert append-only transaction
  const txRes = await tx.query(
    `INSERT INTO client_transactions (
      client_id, type, reference_type, reference_id,
      debit, credit, running_balance, description,
      transaction_date, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()), $10)
    RETURNING *`,
    [
      input.clientId,
      input.type,
      input.referenceType || null,
      input.referenceId || null,
      debit,
      credit,
      newBalance,
      input.description,
      input.transactionDate || null,
      input.userId,
    ]
  );

  // 3. Update client running balance
  await tx.query(
    'UPDATE clients SET current_balance = $1, updated_at = NOW() WHERE id = $2',
    [newBalance, input.clientId]
  );

  return txRes.rows[0];
}

/**
 * Retrieves the client's financial statement / sub-ledger (Extrait de Compte) with debit/credit columns and running balances.
 */
export async function getClientLedger(
  clientId: number,
  params?: {
    fromDate?: string;
    toDate?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const page = Math.max(1, Number(params?.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params?.pageSize) || 30));
  const offset = (page - 1) * pageSize;

  // Verify client exists
  const clRes = await query(
    'SELECT id, code, name, credit_limit, current_balance, status FROM clients WHERE id = $1',
    [clientId]
  );
  if (clRes.rows.length === 0) {
    throw new LedgerError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
  }
  const client = clRes.rows[0];

  const conditions: string[] = ['ct.client_id = $1'];
  const values: any[] = [clientId];
  let idx = 2;

  if (params?.fromDate) {
    conditions.push(`ct.transaction_date >= $${idx++}`);
    values.push(new Date(params.fromDate));
  }

  if (params?.toDate) {
    conditions.push(`ct.transaction_date <= $${idx++}`);
    values.push(new Date(params.toDate));
  }

  if (params?.type && params.type !== 'ALL') {
    conditions.push(`ct.type = $${idx++}`);
    values.push(params.type.toUpperCase());
  }

  const whereClause = conditions.join(' AND ');

  // Count total entries
  const countRes = await query(
    `SELECT COUNT(ct.id)::int AS total
     FROM client_transactions ct
     WHERE ${whereClause}`,
    values
  );
  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Total debits and credits in period
  const totalsRes = await query(
    `SELECT
       COALESCE(SUM(ct.debit), 0)::float AS total_debits,
       COALESCE(SUM(ct.credit), 0)::float AS total_credits
     FROM client_transactions ct
     WHERE ${whereClause}`,
    values
  );

  // Paginated transactions
  const transValues = [...values, pageSize, offset];
  const transRes = await query(
    `SELECT
       ct.*,
       u.full_name AS created_by_name
     FROM client_transactions ct
     LEFT JOIN users u ON u.id = ct.created_by
     WHERE ${whereClause}
     ORDER BY ct.transaction_date ASC, ct.id ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    transValues
  );

  const currentBalance = Number(client.current_balance || 0);
  const creditLimit = Number(client.credit_limit || 0);
  const availableCredit = Math.max(0, creditLimit - currentBalance);

  return {
    client: {
      id: client.id,
      code: client.code,
      name: client.name,
      creditLimit,
      currentBalance,
      availableCredit,
      status: client.status,
    },
    summary: {
      totalDebits: round2(totalsRes.rows[0]?.total_debits || 0),
      totalCredits: round2(totalsRes.rows[0]?.total_credits || 0),
      currentBalance,
      creditLimit,
      availableCredit,
    },
    transactions: transRes.rows.map((r: any) => ({
      id: r.id,
      clientId: r.client_id,
      type: r.type,
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      debit: Number(r.debit),
      credit: Number(r.credit),
      runningBalance: Number(r.running_balance),
      description: r.description,
      transactionDate: r.transaction_date,
      createdByName: r.created_by_name,
    })),
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

/**
 * Quick financial summary for a client.
 */
export async function getClientBalance(clientId: number) {
  const res = await query(
    'SELECT id, code, name, credit_limit, current_balance, status FROM clients WHERE id = $1',
    [clientId]
  );
  if (res.rows.length === 0) {
    throw new LedgerError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
  }
  const client = res.rows[0];
  const currentBalance = Number(client.current_balance || 0);
  const creditLimit = Number(client.credit_limit || 0);
  const availableCredit = Math.max(0, creditLimit - currentBalance);

  return {
    id: client.id,
    code: client.code,
    name: client.name,
    creditLimit,
    currentBalance,
    availableCredit,
    status: client.status,
  };
}

