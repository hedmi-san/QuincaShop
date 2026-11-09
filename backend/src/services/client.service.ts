import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import pg from 'pg';
import { config } from '../config/index.js';
import { query, withTransaction } from '../db/index.js';
import { nextNumber, peekNextClientCode } from './numbering.service.js';
import { createNotification } from './notification.service.js';
import { logAudit } from './audit.service.js';

const CLIENT_DOCS_DIR = path.resolve(config.uploadDir, 'client-docs');
fs.mkdirSync(CLIENT_DOCS_DIR, { recursive: true });

export const uploadClientDocs = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Format non supporté (${file.mimetype}). Formats acceptés : PDF, JPG, PNG, WebP.`));
    }
  },
});

export class ClientError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'CLIENT_ERROR') {
    super(message);
    this.name = 'ClientError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function saveClientDocumentFile(
  clientId: number,
  docType: string,
  file: Express.Multer.File,
  txClient?: pg.PoolClient
) {
  const ext = path.extname(file.originalname)?.toLowerCase() || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
  const safeDocType = (docType || 'OTHER').toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const rand = crypto.randomBytes(6).toString('hex');
  const fileName = `client_${clientId}_${safeDocType}_${Date.now()}_${rand}${ext}`;
  const fullPath = path.join(CLIENT_DOCS_DIR, fileName);

  fs.writeFileSync(fullPath, file.buffer);
  const fileUrl = `/uploads/client-docs/${fileName}`;

  const sql = `
    INSERT INTO client_documents (client_id, doc_type, file_url)
    VALUES ($1, $2, $3)
    RETURNING id, client_id, doc_type, file_url, uploaded_at
  `;
  const params = [clientId, safeDocType, fileUrl];

  const res = txClient ? await txClient.query(sql, params) : await query(sql, params);
  return res.rows[0];
}

export async function getClients(params: {
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

  if (params.status && params.status !== 'ALL') {
    conditions.push(`c.status = $${idx++}`);
    values.push(params.status.toUpperCase());
  }

  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      `(c.name ILIKE $${idx} OR COALESCE(c.code, '') ILIKE $${idx} OR COALESCE(c.contact_person, '') ILIKE $${idx} OR COALESCE(c.phone, '') ILIKE $${idx} OR COALESCE(c.email, '') ILIKE $${idx} OR COALESCE(c.wilaya, '') ILIKE $${idx})`
    );
    values.push(term);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(c.id)::int AS total FROM clients c ${whereClause}`, values);
  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Status summary counts
  const summaryRes = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_count,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_count,
      COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected_count,
      COUNT(*) FILTER (WHERE status = 'SUSPENDED')::int AS suspended_count
    FROM clients
  `);
  const counts = summaryRes.rows[0] || {
    pending_count: 0,
    active_count: 0,
    rejected_count: 0,
    suspended_count: 0,
  };

  const sql = `
    SELECT
      c.*,
      u.email AS user_email,
      u.full_name AS user_full_name,
      u.email_verified,
      approver.full_name AS approved_by_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', cd.id,
            'doc_type', cd.doc_type,
            'file_url', cd.file_url,
            'uploaded_at', cd.uploaded_at
          ) ORDER BY cd.uploaded_at DESC
        ) FILTER (WHERE cd.id IS NOT NULL),
        '[]'::json
      ) AS documents
    FROM clients c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN users approver ON approver.id = c.approved_by
    LEFT JOIN client_documents cd ON cd.client_id = c.id
    ${whereClause}
    GROUP BY c.id, u.email, u.full_name, u.email_verified, approver.full_name
    ORDER BY
      CASE WHEN c.status = 'PENDING' THEN 0 ELSE 1 END,
      c.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;

  values.push(pageSize, offset);
  const res = await query(sql, values);

  return {
    clients: res.rows,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
      counts,
    },
  };
}

export async function getClientById(clientId: number) {
  const sql = `
    SELECT
      c.*,
      u.email AS user_email,
      u.full_name AS user_full_name,
      u.email_verified,
      u.last_login_at,
      approver.full_name AS approved_by_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', cd.id,
            'doc_type', cd.doc_type,
            'file_url', cd.file_url,
            'uploaded_at', cd.uploaded_at
          ) ORDER BY cd.uploaded_at DESC
        ) FILTER (WHERE cd.id IS NOT NULL),
        '[]'::json
      ) AS documents
    FROM clients c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN users approver ON approver.id = c.approved_by
    LEFT JOIN client_documents cd ON cd.client_id = c.id
    WHERE c.id = $1
    GROUP BY c.id, u.email, u.full_name, u.email_verified, u.last_login_at, approver.full_name
  `;

  const res = await query(sql, [clientId]);
  if (res.rows.length === 0) {
    throw new ClientError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
  }
  return res.rows[0];
}

export async function approveClient(
  clientId: number,
  options: { code?: string; creditLimit?: number },
  adminUserId: number,
  ipAddress?: string
) {
  return withTransaction(async (tx) => {
    const curRes = await tx.query('SELECT * FROM clients WHERE id = $1 FOR UPDATE', [clientId]);
    if (curRes.rows.length === 0) {
      throw new ClientError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
    }

    const client = curRes.rows[0];
    let assignedCode = options.code?.trim() || client.code;

    if (!assignedCode) {
      assignedCode = await nextNumber(tx, 'CLT', 0);
    } else {
      // Check uniqueness if custom code provided
      const dupRes = await tx.query(
        'SELECT id FROM clients WHERE code = $1 AND id <> $2',
        [assignedCode, clientId]
      );
      if (dupRes.rows.length > 0) {
        throw new ClientError(`Le code client ${assignedCode} est déjà attribué`, 409, 'CODE_ALREADY_EXISTS');
      }
      // If custom code follows CLT-XXXX pattern, advance sequence if needed
      const match = /^CLT-(\d+)$/.exec(assignedCode);
      if (match) {
        const num = parseInt(match[1], 10);
        await tx.query(
          `INSERT INTO sequences (key, year, last_value) VALUES ('CLT', 0, $1)
           ON CONFLICT (key, year) DO UPDATE SET last_value = GREATEST(sequences.last_value, $1)`,
          [num]
        );
      }
    }

    const creditLimit =
      options.creditLimit !== undefined
        ? Math.max(0, Number(options.creditLimit))
        : Number(client.credit_limit || 0);

    const updRes = await tx.query(
      `UPDATE clients
       SET code = $1,
           status = 'ACTIVE',
           status_reason = NULL,
           credit_limit = $2,
           approved_by = $3,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [assignedCode, creditLimit, adminUserId, clientId]
    );
    const updatedClient = updRes.rows[0];

    // Send notification & simulated email to client user
    let notification = null;
    if (client.user_id) {
      notification = await createNotification(
        {
          userId: client.user_id,
          type: 'ACCOUNT_APPROVED',
          title: `Votre compte professionnel est activé (${assignedCode})`,
          body: `Félicitations ! Votre dossier pour "${client.name}" a été approuvé. Code client : ${assignedCode}. Plafond de crédit autorisé : ${creditLimit.toLocaleString('fr-FR')} DZD. Vous avez désormais un accès immédiat aux tarifs grossistes et à la commande en ligne.`,
          link: '/',
          emailRecipient: client.email,
        },
        tx
      );
    }

    await logAudit(
      {
        userId: adminUserId,
        action: 'CLIENT_APPROVED',
        entityType: 'CLIENT',
        entityId: clientId,
        oldValues: { status: client.status, code: client.code, credit_limit: client.credit_limit },
        newValues: { status: 'ACTIVE', code: assignedCode, credit_limit: creditLimit },
        description: `Approbation du client ${client.name} avec le code ${assignedCode} et plafond ${creditLimit} DZD`,
        ipAddress,
      },
      tx
    );

    return {
      client: updatedClient,
      notification,
    };
  });
}

export async function rejectClient(
  clientId: number,
  reason: string,
  adminUserId: number,
  ipAddress?: string
) {
  if (!reason || !reason.trim()) {
    throw new ClientError('Le motif du rejet est obligatoire', 400, 'VALIDATION_FAILED');
  }

  return withTransaction(async (tx) => {
    const curRes = await tx.query('SELECT * FROM clients WHERE id = $1 FOR UPDATE', [clientId]);
    if (curRes.rows.length === 0) {
      throw new ClientError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
    }

    const client = curRes.rows[0];

    const updRes = await tx.query(
      `UPDATE clients
       SET status = 'REJECTED',
           status_reason = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason.trim(), clientId]
    );
    const updatedClient = updRes.rows[0];

    if (client.user_id) {
      await createNotification(
        {
          userId: client.user_id,
          type: 'ACCOUNT_REJECTED',
          title: 'Mise à jour concernant votre demande de compte B2B',
          body: `Votre demande d'agrément pour "${client.name}" n'a pas pu être validée. Motif : ${reason.trim()}`,
          link: '/portal/pending',
          emailRecipient: client.email,
        },
        tx
      );
    }

    await logAudit(
      {
        userId: adminUserId,
        action: 'CLIENT_REJECTED',
        entityType: 'CLIENT',
        entityId: clientId,
        oldValues: { status: client.status },
        newValues: { status: 'REJECTED', status_reason: reason.trim() },
        description: `Rejet du dossier client ${client.name}. Motif : ${reason.trim()}`,
        ipAddress,
      },
      tx
    );

    return updatedClient;
  });
}

export async function suspendClient(
  clientId: number,
  reason: string,
  adminUserId: number,
  ipAddress?: string
) {
  if (!reason || !reason.trim()) {
    throw new ClientError('Le motif de suspension est obligatoire', 400, 'VALIDATION_FAILED');
  }

  return withTransaction(async (tx) => {
    const curRes = await tx.query('SELECT * FROM clients WHERE id = $1 FOR UPDATE', [clientId]);
    if (curRes.rows.length === 0) {
      throw new ClientError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
    }

    const client = curRes.rows[0];

    const updRes = await tx.query(
      `UPDATE clients
       SET status = 'SUSPENDED',
           status_reason = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason.trim(), clientId]
    );

    if (client.user_id) {
      await createNotification(
        {
          userId: client.user_id,
          type: 'ACCOUNT_SUSPENDED',
          title: 'Compte professionnel temporairement suspendu',
          body: `Votre compte "${client.name}" a été suspendu. Motif : ${reason.trim()}`,
          link: '/portal/pending',
          emailRecipient: client.email,
        },
        tx
      );
    }

    await logAudit(
      {
        userId: adminUserId,
        action: 'CLIENT_SUSPENDED',
        entityType: 'CLIENT',
        entityId: clientId,
        oldValues: { status: client.status },
        newValues: { status: 'SUSPENDED', status_reason: reason.trim() },
        description: `Suspension du client ${client.name}. Motif : ${reason.trim()}`,
        ipAddress,
      },
      tx
    );

    return updRes.rows[0];
  });
}

export async function reactivateClient(
  clientId: number,
  adminUserId: number,
  ipAddress?: string
) {
  return withTransaction(async (tx) => {
    const curRes = await tx.query('SELECT * FROM clients WHERE id = $1 FOR UPDATE', [clientId]);
    if (curRes.rows.length === 0) {
      throw new ClientError('Client introuvable', 404, 'ENTITY_NOT_FOUND');
    }

    const client = curRes.rows[0];
    const assignedCode = client.code || (await nextNumber(tx, 'CLT', 0));

    const updRes = await tx.query(
      `UPDATE clients
       SET code = $1,
           status = 'ACTIVE',
           status_reason = NULL,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [assignedCode, clientId]
    );

    if (client.user_id) {
      await createNotification(
        {
          userId: client.user_id,
          type: 'ACCOUNT_REACTIVATED',
          title: 'Votre compte professionnel a été réactivé',
          body: `Votre compte "${client.name}" (${assignedCode}) est de nouveau actif.`,
          link: '/',
          emailRecipient: client.email,
        },
        tx
      );
    }

    await logAudit(
      {
        userId: adminUserId,
        action: 'CLIENT_REACTIVATED',
        entityType: 'CLIENT',
        entityId: clientId,
        oldValues: { status: client.status },
        newValues: { status: 'ACTIVE', code: assignedCode },
        description: `Réactivation du client ${client.name} (${assignedCode})`,
        ipAddress,
      },
      tx
    );

    return updRes.rows[0];
  });
}

export async function createManualClient(
  data: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    wilaya?: string;
    rc?: string;
    nif?: string;
    art?: string;
    nis?: string;
    activite?: string;
    creditLimit?: number;
  },
  adminUserId: number,
  ipAddress?: string
) {
  return withTransaction(async (tx) => {
    const code = await nextNumber(tx, 'CLT', 0);
    const res = await tx.query(
      `INSERT INTO clients (
        code, name, contact_person, phone, email, address, wilaya,
        rc, nif, art, nis, activite, status, approved_by, approved_at, credit_limit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE', $13, NOW(), $14)
      RETURNING *`,
      [
        code,
        data.name,
        data.contactPerson || null,
        data.phone || null,
        data.email || null,
        data.address || null,
        data.wilaya || null,
        data.rc || null,
        data.nif || null,
        data.art || null,
        data.nis || null,
        data.activite || null,
        adminUserId,
        Math.max(0, Number(data.creditLimit || 0)),
      ]
    );

    const newClient = res.rows[0];

    await logAudit(
      {
        userId: adminUserId,
        action: 'CLIENT_CREATED_MANUAL',
        entityType: 'CLIENT',
        entityId: newClient.id,
        newValues: { code, name: data.name, status: 'ACTIVE' },
        description: `Création manuelle du client ${data.name} (${code})`,
        ipAddress,
      },
      tx
    );

    return newClient;
  });
}

export { peekNextClientCode };

