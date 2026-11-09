import pg from 'pg';
import { config } from '../config/index.js';

const { Pool, types } = pg;

// Type parsers:
// NUMERIC (OID 1700) -> float
types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));
// BIGINT / int8 (OID 20) -> integer
types.setTypeParser(20, (val: string) => (val === null ? null : parseInt(val, 10)));
// DATE (OID 1082) -> string 'YYYY-MM-DD' (prevents UTC timezone offset shift)
types.setTypeParser(1082, (val: string) => val);

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Execute a parameterized query using a pooled connection
 */
export async function query<R extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<R>> {
  return pool.query<R>(text, params);
}

/**
 * Acquire a single client from the pool
 */
export async function getClient(): Promise<pg.PoolClient> {
  return pool.connect();
}

/**
 * Execute work inside a database transaction (BEGIN ... COMMIT / ROLLBACK)
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Check if the database connection is alive
 */
export async function checkDbConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT 1 AS alive');
    return res.rows?.[0]?.alive === 1;
  } catch (err) {
    console.error('Database connection check failed:', err);
    return false;
  }
}

/**
 * Helper to round money to 2 decimal places
 */
export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

