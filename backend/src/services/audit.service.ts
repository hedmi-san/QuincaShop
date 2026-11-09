import pg from 'pg';
import { query } from '../db/index.js';

export interface AuditLogInput {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId: string | number;
  oldValues?: any;
  newValues?: any;
  description: string;
  ipAddress?: string | null;
}

export async function logAudit(
  input: AuditLogInput,
  txClient?: pg.PoolClient
) {
  const sql = `
    INSERT INTO audit_logs (
      user_id, action, entity_type, entity_id,
      old_values, new_values, description, ip_address
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, created_at
  `;
  const params = [
    input.userId || null,
    input.action,
    input.entityType,
    String(input.entityId),
    input.oldValues ? JSON.stringify(input.oldValues) : null,
    input.newValues ? JSON.stringify(input.newValues) : null,
    input.description,
    input.ipAddress || null,
  ];

  if (txClient) {
    const res = await txClient.query(sql, params);
    return res.rows[0];
  }
  const res = await query(sql, params);
  return res.rows[0];
}

