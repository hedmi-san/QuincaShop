import { query, withTransaction, round2 } from '../db/index.js';
import { nextNumber, SequenceKey } from './numbering.service.js';
import { recordTransaction } from './ledger.service.js';
import { amountToFrenchWords } from '../utils/numberToWords.js';
import { createNotification } from './notification.service.js';
import { logAudit } from './audit.service.js';

export class FactureError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'FACTURE_ERROR') {
    super(message);
    this.name = 'FactureError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type DocType = 'FACTURE' | 'PROFORMA' | 'BON_LIVRAISON';

export interface CreateFactureInput {
  orderId: number;
  docType?: DocType;
  paymentMode?: string;
  transportMode?: string;
  truckNumber?: string;
  driverName?: string;
}

/**
 * Calculates the Algerian fiscal stamp (Droit de Timbre Fiscal)
 * Applicable only for cash payments (ESPECE).
 * 1% graduated, min 5 DZD, max 10,000 DZD.
 */
export function calculateTimbreFiscal(paymentMode: string, subtotalWithTva: number): number {
  const normMode = (paymentMode || '').toUpperCase();
  if (normMode !== 'ESPECE' && normMode !== 'CASH') {
    return 0;
  }

  const raw = subtotalWithTva * 0.01;
  const timbre = Math.min(Math.max(Math.round(raw), 5), 10000);
  return round2(timbre);
}

export async function createFactureFromOrder(
  input: CreateFactureInput,
  userId: number
) {
  const docType = input.docType || 'FACTURE';

  return withTransaction(async (tx) => {
    // 1. Lock and retrieve order
    const oRes = await tx.query(
      `SELECT o.*, c.name AS client_name, c.user_id AS client_user_id, c.email AS client_email,
              c.code AS client_code, c.phone AS client_phone, c.address AS client_address,
              c.wilaya AS client_wilaya, c.rc AS client_rc, c.nif AS client_nif,
              c.nis AS client_nis, c.art AS client_art, c.activite AS client_activite
       FROM orders o
       JOIN clients c ON c.id = o.client_id
       WHERE o.id = $1 FOR UPDATE`,
      [input.orderId]
    );

    if (oRes.rows.length === 0) {
      throw new FactureError('Commande introuvable', 404, 'ENTITY_NOT_FOUND');
    }
    const order = oRes.rows[0];

    // 2. Check if active Facture already exists for this order
    if (docType === 'FACTURE') {
      const existing = await tx.query(
        `SELECT id, facture_number FROM factures
         WHERE order_id = $1 AND doc_type = 'FACTURE' AND status = 'ISSUED'`,
        [order.id]
      );
      if (existing.rows.length > 0) {
        throw new FactureError(
          `Une facture officielle active existe déjà pour cette commande (${existing.rows[0].facture_number})`,
          409,
          'FACTURE_ALREADY_EXISTS'
        );
      }
    }

    // 3. Load order items
    const itemsRes = await tx.query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC`,
      [order.id]
    );
    if (itemsRes.rows.length === 0) {
      throw new FactureError('La commande ne comporte aucun article', 400, 'ORDER_ITEMS_EMPTY');
    }
    const items = itemsRes.rows;

    // 4. Load company settings for company_snapshot
    const setRes = await tx.query(`SELECT value FROM settings WHERE key = 'company'`);
    const companySettings = setRes.rows[0]?.value || {};

    const companySnapshot = {
      name: companySettings.name || 'SARL Outillage Industriel Algérie',
      address: companySettings.address || 'Zone Industrielle Oued Smar, Alger',
      phone: companySettings.phone || '+213 (0) 23 92 11 22',
      email: companySettings.email || 'contact@outillage-algerie.dz',
      rc: companySettings.rc || '16/00-0123456B16',
      nif: companySettings.nif || '001616012345678',
      nis: companySettings.nis || '001616010012345',
      art: companySettings.art || '16123456789',
      capital: companySettings.capital || '10 000 000 DZD',
      bank: companySettings.bank || 'BEA Agence Rouiba - 002 00012 1234567890 45',
      logoUrl: companySettings.logo_url || '/assets/images/logo.png',
    };

    const clientSnapshot = {
      id: order.client_id,
      code: order.client_code,
      name: order.client_name,
      contactPerson: order.client_contact_person || '',
      phone: order.client_phone || '',
      email: order.client_email || '',
      address: order.delivery_address || order.client_address || '',
      wilaya: order.client_wilaya || '',
      rc: order.client_rc || '',
      nif: order.client_nif || '',
      nis: order.client_nis || '',
      art: order.client_art || '',
      activite: order.client_activite || '',
    };

    // 5. Numbering sequence key
    let seqKey: SequenceKey = 'FAC';
    if (docType === 'BON_LIVRAISON') seqKey = 'BL';
    if (docType === 'PROFORMA') seqKey = 'PRO';

    const factureNumber = await nextNumber(tx, seqKey);

    // 6. Calculate amounts and Timbre Fiscal
    const totalHt = round2(Number(order.subtotal_ht));
    const totalTva = round2(Number(order.total_tva));
    const subtotalWithTva = round2(totalHt + totalTva);

    const paymentMode = (input.paymentMode || order.payment_method || 'ON_CREDIT').toUpperCase();
    const timbre = calculateTimbreFiscal(paymentMode, subtotalWithTva);
    const totalTtc = round2(subtotalWithTva + timbre);

    const amountInWords = amountToFrenchWords(totalTtc);

    // 7. Insert into factures
    const fRes = await tx.query(
      `INSERT INTO factures (
        facture_number, doc_type, order_id, client_id, payment_mode,
        total_ht, total_tva, timbre, total_ttc, amount_in_words,
        transport_mode, truck_number, driver_name,
        client_snapshot, company_snapshot, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'ISSUED', $16)
      RETURNING *`,
      [
        factureNumber,
        docType,
        order.id,
        order.client_id,
        paymentMode,
        totalHt,
        totalTva,
        timbre,
        totalTtc,
        amountInWords,
        input.transportMode || (order.fulfillment_type === 'DELIVERY' ? 'CAMIONNETTE' : 'RETRAIT'),
        input.truckNumber || null,
        input.driverName || null,
        JSON.stringify(clientSnapshot),
        JSON.stringify(companySnapshot),
        userId,
      ]
    );
    const facture = fRes.rows[0];

    // 8. Insert snapshot items into facture_items
    for (const item of items) {
      await tx.query(
        `INSERT INTO facture_items (
          facture_id, reference, designation, unit, quantity, unit_price_ht, tva
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          facture.id,
          item.reference,
          item.product_name,
          item.unit,
          item.quantity,
          item.unit_price,
          item.tva,
        ]
      );
    }

    // 9. If official FACTURE on credit, record in Client Sub-Ledger (Debit entry)
    if (docType === 'FACTURE') {
      const isCredit = paymentMode === 'ON_CREDIT' || paymentMode === 'A_CREDIT';
      if (isCredit) {
        await recordTransaction(tx, {
          clientId: order.client_id,
          type: 'INVOICE',
          referenceType: 'FACTURE',
          referenceId: facture.id,
          debit: totalTtc,
          credit: 0,
          description: `Facture ${factureNumber} (Commande ${order.order_number})`,
          userId,
        });
      }
    }

    // 10. Notifications & Audit
    if (order.client_user_id) {
      const docNames: Record<DocType, string> = {
        FACTURE: 'Facture Fiscale',
        BON_LIVRAISON: 'Bon de Livraison',
        PROFORMA: 'Facture Proforma',
      };
      await createNotification(
        {
          userId: order.client_user_id,
          type: `DOCUMENT_ISSUED_${docType}`,
          title: `${docNames[docType]} disponible : ${factureNumber}`,
          body: `Votre document ${factureNumber} d'un montant de ${totalTtc.toLocaleString('fr-FR')} DZD a été émis pour la commande ${order.order_number}.`,
          link: `/portal/me/factures/${facture.id}`,
          emailRecipient: order.client_email,
        },
        tx
      );
    }

    await logAudit(
      {
        userId,
        action: 'FACTURE_CREATED',
        entityType: 'FACTURE',
        entityId: facture.id,
        newValues: {
          factureNumber,
          docType,
          orderId: order.id,
          totalTtc,
          timbre,
        },
        description: `Génération du document ${factureNumber} (${docType}) pour la commande ${order.order_number}`,
      },
      tx
    );

    return {
      ...facture,
      items,
      client_snapshot: clientSnapshot,
      company_snapshot: companySnapshot,
    };
  });
}

/**
 * Voids an issued invoice (Annulation).
 * Invoices can NEVER be deleted from PostgreSQL per Algerian tax regulations.
 * If the facture had debited the client's balance, an offsetting CREDIT_NOTE is appended to the ledger.
 */
export async function voidFacture(
  factureId: number,
  userId: number,
  voidReason: string
) {
  if (!voidReason || voidReason.trim().length < 3) {
    throw new FactureError('Le motif d’annulation est obligatoire (min. 3 caractères)', 400, 'VOID_REASON_REQUIRED');
  }

  return withTransaction(async (tx) => {
    // 1. Lock facture
    const fRes = await tx.query(
      `SELECT f.*, c.user_id AS client_user_id, c.email AS client_email, c.name AS client_name
       FROM factures f
       JOIN clients c ON c.id = f.client_id
       WHERE f.id = $1 FOR UPDATE`,
      [factureId]
    );

    if (fRes.rows.length === 0) {
      throw new FactureError('Facture introuvable', 404, 'ENTITY_NOT_FOUND');
    }
    const facture = fRes.rows[0];

    if (facture.status === 'VOIDED') {
      throw new FactureError('Cette facture a déjà été annulée', 422, 'FACTURE_ALREADY_VOIDED');
    }

    // 2. Mark facture as VOIDED
    const updRes = await tx.query(
      `UPDATE factures
       SET status = 'VOIDED', voided_at = NOW(), voided_by = $1, void_reason = $2
       WHERE id = $3
       RETURNING *`,
      [userId, voidReason.trim(), factureId]
    );
    const updatedFacture = updRes.rows[0];

    // 3. If it was an official FACTURE on credit that had debited the ledger, post compensating CREDIT_NOTE
    if (facture.doc_type === 'FACTURE') {
      const isCredit = facture.payment_mode === 'ON_CREDIT' || facture.payment_mode === 'A_CREDIT';
      if (isCredit) {
        await recordTransaction(tx, {
          clientId: facture.client_id,
          type: 'CREDIT_NOTE',
          referenceType: 'FACTURE',
          referenceId: facture.id,
          debit: 0,
          credit: Number(facture.total_ttc),
          description: `Avoir / Annulation Facture ${facture.facture_number} (${voidReason.trim()})`,
          userId,
        });
      }
    }

    // 4. Notifications & Audit
    if (facture.client_user_id) {
      await createNotification(
        {
          userId: facture.client_user_id,
          type: 'FACTURE_VOIDED',
          title: `Facture ${facture.facture_number} annulée`,
          body: `La facture ${facture.facture_number} a été annulée. Motif : ${voidReason.trim()}`,
          link: `/portal/me/factures`,
          emailRecipient: facture.client_email,
        },
        tx
      );
    }

    await logAudit(
      {
        userId,
        action: 'FACTURE_VOIDED',
        entityType: 'FACTURE',
        entityId: facture.id,
        oldValues: { status: 'ISSUED' },
        newValues: { status: 'VOIDED', voidReason: voidReason.trim() },
        description: `Annulation de la facture ${facture.facture_number} (${voidReason.trim()})`,
      },
      tx
    );

    return updatedFacture;
  });
}

export async function getFactures(params: {
  clientId?: number;
  docType?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 25));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (params.clientId) {
    conditions.push(`f.client_id = $${idx++}`);
    values.push(params.clientId);
  }

  if (params.docType && params.docType !== 'ALL') {
    conditions.push(`f.doc_type = $${idx++}`);
    values.push(params.docType.toUpperCase());
  }

  if (params.status && params.status !== 'ALL') {
    conditions.push(`f.status = $${idx++}`);
    values.push(params.status.toUpperCase());
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(`(f.facture_number ILIKE $${idx} OR c.name ILIKE $${idx} OR COALESCE(c.code,'') ILIKE $${idx} OR o.order_number ILIKE $${idx})`);
    values.push(term);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(f.id)::int AS total
     FROM factures f
     JOIN clients c ON c.id = f.client_id
     JOIN orders o ON o.id = f.order_id
     ${whereClause}`,
    values
  );
  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const sql = `
    SELECT
      f.*,
      c.code AS client_code,
      c.name AS client_name,
      c.phone AS client_phone,
      c.wilaya AS client_wilaya,
      o.order_number,
      (SELECT COUNT(fi.id)::int FROM facture_items fi WHERE fi.facture_id = f.id) AS items_count
    FROM factures f
    JOIN clients c ON c.id = f.client_id
    JOIN orders o ON o.id = f.order_id
    ${whereClause}
    ORDER BY f.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;

  values.push(pageSize, offset);
  const res = await query(sql, values);

  return {
    factures: res.rows,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function getFactureById(id: number, clientId?: number) {
  let condition = 'f.id = $1';
  const params: any[] = [id];
  if (clientId) {
    condition += ' AND f.client_id = $2';
    params.push(clientId);
  }

  const fRes = await query(
    `SELECT
      f.*,
      o.order_number,
      u.full_name AS created_by_name,
      vu.full_name AS voided_by_name
     FROM factures f
     JOIN orders o ON o.id = f.order_id
     JOIN users u ON u.id = f.created_by
     LEFT JOIN users vu ON vu.id = f.voided_by
     WHERE ${condition}`,
    params
  );

  if (fRes.rows.length === 0) {
    throw new FactureError('Document introuvable', 404, 'ENTITY_NOT_FOUND');
  }
  const facture = fRes.rows[0];

  const itemsRes = await query(
    `SELECT * FROM facture_items WHERE facture_id = $1 ORDER BY id ASC`,
    [id]
  );

  return {
    ...facture,
    items: itemsRes.rows,
  };
}

