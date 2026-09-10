/**
 * The migration runner.
 *
 * Applies every `.sql` file in `migrations/` that has not run yet, in filename
 * order, each in its own transaction. Postgres has transactional DDL, so a
 * migration that fails part-way leaves nothing behind — which is the property
 * that makes forty lines of runner defensible instead of reckless.
 *
 * It takes no advisory lock, so two processes migrating at once could both try
 * to apply the same file. That is fine for one developer and a single deploy,
 * and is the first thing to fix if that stops being true.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from './db.ts';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

async function applied(): Promise<Set<string>> {
  await pool.query(`
    create table if not exists schema_migrations (
      version    text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const { rows } = await pool.query<{ version: string }>('select version from schema_migrations');
  return new Set(rows.map(row => row.version));
}

export async function migrate(): Promise<string[]> {
  const done = await applied();

  const files = (await readdir(MIGRATIONS_DIR))
    .filter(name => name.endsWith('.sql'))
    .sort();

  const ran: string[] = [];

  for (const file of files) {
    if (done.has(file)) {
      continue;
    }

    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();

    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (version) values ($1)', [file]);
      await client.query('commit');
      ran.push(file);
    } catch (error) {
      await client.query('rollback');
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`, { cause: error });
    } finally {
      client.release();
    }
  }

  return ran;
}

// Run directly (`npm run migrate`) rather than imported by a test.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const ran = await migrate();
    console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Nothing to apply.');
    await pool.end();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
