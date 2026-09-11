/**
 * The connection pool.
 *
 * One pool for the whole process. Handlers take a connection for the length of
 * a query and give it straight back.
 *
 * The change stream will need a *separate*, dedicated client that is never
 * returned to this pool — a pooled connection stops listening the moment it is
 * released, so `LISTEN` cannot use one. See `docs/streaming.md`.
 */
import pg from 'pg';

import { config } from './config.ts';

/*
 * Postgres returns `date` columns as a Date object by default, converted into
 * the server's local zone — which silently moves a session's calendar day. The
 * domain treats a date as the string 'YYYY-MM-DD' and nothing else, so tell the
 * driver to hand it back untouched.
 */
const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, value => value);

/*
 * bigint arrives as a string because it can exceed Number.MAX_SAFE_INTEGER.
 * change_log.id is a bigserial used as a cursor, and a cursor is a string to
 * everyone above the database anyway, so this is left alone deliberately.
 */

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

/** Runs `work` inside a transaction, rolling back if it throws. */
export async function transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
