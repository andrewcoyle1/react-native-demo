/**
 * Rate limiting.
 *
 * Built with its own tight limits, because the point is to reach them. Every
 * other test file raises them out of the way — see `buildTestApp`.
 */
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';

import { buildApp } from '../src/app.ts';
import { pool } from '../src/db.ts';
import { migrate } from '../src/migrate.ts';
import { resetDatabase } from './helpers.ts';

await migrate();

// Three attempts at an auth endpoint, twenty at anything else.
const app = await buildApp({ rateLimit: { max: 20, authMax: 3 } });
await app.ready();

after(async () => {
  await app.close();
  await pool.end();
});

beforeEach(resetDatabase);

/** A distinct address per test, so one test's budget is not another's. */
let addresses = 0;
const nextAddress = () => `10.0.0.${(addresses += 1) % 250}`;

const signIn = (remoteAddress: string, email = 'nobody@example.com') =>
  app.inject({
    method: 'POST',
    url: '/v1/auth/sign-in',
    remoteAddress,
    payload: { email, password: 'whatever-it-does-not-matter' },
  });

describe('the auth endpoints', () => {
  it('stops a burst of sign-in attempts', async () => {
    const ip = nextAddress();

    // Three are allowed; each fails on credentials, which is a 401.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      assert.equal((await signIn(ip)).statusCode, 401, `attempt ${attempt + 1}`);
    }

    const blocked = await signIn(ip);

    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.json().error.code, 'rate_limited');
  });

  it('says when to come back', async () => {
    const ip = nextAddress();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await signIn(ip);
    }

    const blocked = await signIn(ip);

    // docs/api.md tells clients to honour this, so it had better be there.
    assert.ok(blocked.headers['retry-after'], 'Retry-After is missing');
    assert.match(blocked.json().error.message, /try again/i);
  });

  it('counts each address separately', async () => {
    const attacker = nextAddress();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await signIn(attacker);
    }
    assert.equal((await signIn(attacker)).statusCode, 429);

    // Someone else, unaffected.
    assert.equal((await signIn(nextAddress())).statusCode, 401);
  });

  it('holds sign-up to the same budget', async () => {
    const ip = nextAddress();
    const signUp = (email: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/auth/sign-up',
        remoteAddress: ip,
        payload: { email, password: 'a-good-long-password', timezone: 'UTC' },
      });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      assert.equal((await signUp(`athlete${attempt}@example.com`)).statusCode, 201);
    }

    assert.equal((await signUp('athlete4@example.com')).statusCode, 429);
  });

  it('leaves ordinary endpoints on the looser budget', async () => {
    const ip = nextAddress();

    // The strict budget is 3. Health is not an auth endpoint, so it survives
    // well past that.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await app.inject({ method: 'GET', url: '/health', remoteAddress: ip });
      assert.equal(response.statusCode, 200, `request ${attempt + 1}`);
    }
  });

  it('reports what is left', async () => {
    const response = await signIn(nextAddress());

    assert.equal(response.headers['x-ratelimit-limit'], '3');
    assert.equal(response.headers['x-ratelimit-remaining'], '2');
  });
});
