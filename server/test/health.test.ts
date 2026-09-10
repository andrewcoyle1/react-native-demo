/**
 * The scaffold's own test: the app builds, routes, and can reach Postgres.
 *
 * Nothing here is about the product. It exists so that when an auth test fails
 * later, it is because auth is wrong and not because the harness never worked.
 */
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { pool } from '../src/db.ts';
import { migrate } from '../src/migrate.ts';
import { buildTestApp } from './helpers.ts';

const app = await buildTestApp();

after(async () => {
  await app.close();
  await pool.end();
});

describe('scaffold', () => {
  it('applies migrations idempotently', async () => {
    await migrate();
    const second = await migrate();
    assert.deepEqual(second, [], 'a second run should have nothing left to apply');
  });

  it('creates the shared trigger function', async () => {
    const { rows } = await pool.query(
      "select 1 from pg_proc where proname = 'touch_modified_at'",
    );
    assert.equal(rows.length, 1);
  });

  it('reports healthy when the database is reachable', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'ok');
  });
});
