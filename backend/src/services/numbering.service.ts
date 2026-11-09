import pg from 'pg';
import { query } from '../db/index.js';

export type SequenceKey = 'CLT' | 'CMD' | 'FAC' | 'BL' | 'PRO' | 'PAY' | 'AVO';

/**
 * Generates the next gap-free sequence number inside an active transaction.
 * - For 'CLT': year is 0 -> formats as CLT-0001
 * - For yearly sequences ('CMD', 'FAC', etc.): formats as KEY-YYYY-0001
 */
export async function nextNumber(
  client: pg.PoolClient,
  key: SequenceKey,
  year: number = key === 'CLT' ? 0 : new Date().getFullYear()
): Promise<string> {
  if (key === 'CLT') {
    // Sync sequence with any existing CLT-XXXX codes seeded outside sequences table
    await client.query(`
      INSERT INTO sequences (key, year, last_value)
      SELECT 'CLT', 0, COALESCE(
        MAX( SUBSTRING(code FROM '^CLT-([0-9]+)$')::int ), 0
      )
      FROM clients
      WHERE code ~ '^CLT-[0-9]+$'
      ON CONFLICT (key, year) DO UPDATE
      SET last_value = GREATEST(sequences.last_value, EXCLUDED.last_value)
    `);
  }

  const res = await client.query(
    `INSERT INTO sequences (key, year, last_value)
     VALUES ($1, $2, 1)
     ON CONFLICT (key, year)
     DO UPDATE SET last_value = sequences.last_value + 1
     RETURNING last_value`,
    [key, year]
  );

  const val = Number(res.rows[0].last_value);
  const padded = String(val).padStart(4, '0');

  if (key === 'CLT' || year === 0) {
    return `${key}-${padded}`;
  }

  return `${key}-${year}-${padded}`;
}

/**
 * Peeks at the next available client code (e.g. CLT-0002) without incrementing the sequence.
 */
export async function peekNextClientCode(): Promise<string> {
  const res = await query(`
    SELECT GREATEST(
      COALESCE((SELECT last_value FROM sequences WHERE key = 'CLT' AND year = 0), 0),
      COALESCE((SELECT MAX(SUBSTRING(code FROM '^CLT-([0-9]+)$')::int) FROM clients WHERE code ~ '^CLT-[0-9]+$'), 0)
    ) + 1 AS next_val
  `);
  const nextVal = Number(res.rows[0]?.next_val || 1);
  return `CLT-${String(nextVal).padStart(4, '0')}`;
}

