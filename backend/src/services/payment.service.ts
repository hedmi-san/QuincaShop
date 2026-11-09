import { query, withTransaction, round2 } from '../db/index.js';
import { nextNumber } from './numbering.service.js';
import { recordTransaction } from './ledger.service.js';
import { createNotification } from './notification.service.js';
import { logAudit } from './audit.service.js';

export class PaymentError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'PAYMENT_ERROR') {
    super(message);
    this.name = 'PaymentError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type PaymentMethod = 'CASH' | 'CHECK' | 'TRANSFER';

export interface RecordPaymentInput {
  clientId: number;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paymentDate?: string;
  allocatedOrderIds?: number[];
  userId: number;
}

export async function recordPayment(input: RecordPaymentInput) {
  const amount = round2(Number(input.amount));
  if (isNaN(amount) || amount <= 0) {
    throw new PaymentError('Le montant du versement doit être supérieur à zéro', 400, 'INVALID_AMOUNT');
  }

  return withTransaction(async (tx) => {
    // 1. Verify client
    const clRes = await tx.query(
      'SELECT id, name, user_id, email, current_balance FROM clients WHERE id = $1 FOR UPDATE',
      [input.clientId]
    );
    if (clRes.rows.length === 0) {
      throw new PaymentError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
    }
    const client = clRes.rows[0];

    // 2. Generate sequence number (PAY-YYYY-0001)
    const paymentNumber = await nextNumber(tx, 'PAY');

    // 3. Insert payment record
    const payRes = await tx.query(
      `INSERT INTO client_payments (
        payment_number, client_id, amount, method, reference, payment_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7)
      RETURNING *`,
      [
        paymentNumber,
        client.id,
        amount,
        input.method,
        input.reference || null,
        input.paymentDate ? new Date(input.paymentDate) : null,
        input.userId,
      ]
    );
    const payment = payRes.rows[0];

    // 4. Handle allocations if specified
    if (input.allocatedOrderIds && input.allocatedOrderIds.length > 0) {
      // Divide or allocate against selected orders
      const perOrderAmount = round2(amount / input.allocatedOrderIds.length);
      for (const orderId of input.allocatedOrderIds) {
        await tx.query(
          `INSERT INTO payment_allocations (payment_id, order_id, amount)
           VALUES ($1, $2, $3)`,
          [payment.id, orderId, perOrderAmount]
        );
      }
    }

    // 5. Append to Client Sub-Ledger (Credit entry, reducing client balance)
    const methodLabels: Record<PaymentMethod, string> = {
      CASH: 'Espèces',
      CHECK: 'Chèque',
      TRANSFER: 'Virement',
    };
    const desc = `Versement ${paymentNumber} (${methodLabels[input.method] || input.method}${input.reference ? ' - Réf: ' + input.reference : ''})`;

    await recordTransaction(tx, {
      clientId: client.id,
      type: 'PAYMENT',
      referenceType: 'PAYMENT',
      referenceId: payment.id,
      debit: 0,
      credit: amount,
      description: desc,
      userId: input.userId,
      transactionDate: input.paymentDate ? new Date(input.paymentDate) : undefined,
    });

    // 6. Notifications & Audit
    if (client.user_id) {
      await createNotification(
        {
          userId: client.user_id,
          type: 'PAYMENT_RECEIVED',
          title: `Règlement enregistré : ${paymentNumber}`,
          body: `Votre versement de ${amount.toLocaleString('fr-FR')} DZD a été crédité sur votre compte.`,
          link: '/portal/me/statement',
          emailRecipient: client.email,
        },
        tx
      );
    }

    await createNotification(
      {
        roleTarget: 'ADMIN',
        type: 'PAYMENT_RECEIVED',
        title: `Paiement ${paymentNumber} - ${client.name}`,
        body: `Versement de ${amount.toLocaleString('fr-FR')} DZD reçu (${methodLabels[input.method] || input.method}).`,
        link: `/admin/clients/${client.id}/ledger`,
      },
      tx
    );

    await logAudit(
      {
        userId: input.userId,
        action: 'PAYMENT_RECORDED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        newValues: {
          paymentNumber,
          clientId: client.id,
          amount,
          method: input.method,
          reference: input.reference,
        },
        description: `Enregistrement du versement ${paymentNumber} de ${amount} DZD pour ${client.name}`,
      },
      tx
    );

    return payment;
  });
}

export async function getClientPayments(
  clientId: number,
  page = 1,
  pageSize = 20
) {
  const p = Math.max(1, page);
  const size = Math.min(100, Math.max(1, pageSize));
  const offset = (p - 1) * size;

  const countRes = await query(
    'SELECT COUNT(id)::int AS total FROM client_payments WHERE client_id = $1',
    [clientId]
  );
  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.ceil(total / size) || 1;

  const res = await query(
    `SELECT cp.*, u.full_name AS created_by_name
     FROM client_payments cp
     LEFT JOIN users u ON u.id = cp.created_by
     WHERE cp.client_id = $1
     ORDER BY cp.payment_date DESC, cp.id DESC
     LIMIT $2 OFFSET $3`,
    [clientId, size, offset]
  );

  return {
    payments: res.rows,
    meta: {
      page: p,
      pageSize: size,
      total,
      totalPages,
    },
  };
}

