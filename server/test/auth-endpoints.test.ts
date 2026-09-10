/**
 * The auth endpoints, exercised through the app.
 *
 * `inject()` rather than a live socket: no ports, no teardown races, and the
 * whole request pipeline still runs — schema validation, the preHandler, the
 * error renderer.
 */
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';

import { pool } from '../src/db.ts';
import { migrate } from '../src/migrate.ts';
import { resetDatabase, buildTestApp } from './helpers.ts';

await migrate();
const app = await buildTestApp();
await app.ready();

after(async () => {
  await app.close();
  await pool.end();
});

beforeEach(resetDatabase);

const CREDENTIALS = {
  email: 'athlete@example.com',
  password: 'a-good-long-password',
  timezone: 'Europe/Dublin',
};

const post = (url: string, payload: object) =>
  app.inject({ method: 'POST', url, payload });

async function signUp() {
  const response = await post('/v1/auth/sign-up', CREDENTIALS);
  assert.equal(response.statusCode, 201, response.body);
  return response.json();
}

describe('sign-up', () => {
  it('creates an account and returns a session', async () => {
    const session = await signUp();

    assert.ok(session.accessToken);
    assert.ok(session.refreshToken);
    assert.ok(Date.parse(session.expiresAt) > Date.now());
    assert.equal(session.user.email, CREDENTIALS.email);
    assert.deepEqual(session.user.providers, ['email']);
  });

  it('never reports a new account as verified', async () => {
    const session = await signUp();

    // Stubbing this true would re-open the linking takeover; see
    // docs/schema-auth.md.
    assert.equal(session.user.emailVerified, false);
  });

  it('stores the password as an argon2id hash, never in the clear', async () => {
    await signUp();
    const { rows } = await pool.query<{ password_hash: string }>(
      'select password_hash from identities',
    );

    assert.match(rows[0]!.password_hash, /^\$argon2id\$/);
    assert.ok(!rows[0]!.password_hash.includes(CREDENTIALS.password));
  });

  it('refuses a duplicate email, whatever its case', async () => {
    await signUp();
    const response = await post('/v1/auth/sign-up', {
      ...CREDENTIALS,
      email: 'ATHLETE@example.com',
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, 'email_taken');
  });

  it('rejects a short password before reaching a handler', async () => {
    const response = await post('/v1/auth/sign-up', { ...CREDENTIALS, password: 'short' });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, 'validation_failed');
  });

  it('strips unknown fields instead of honouring them', async () => {
    // docs/api.md: servers strip what they do not declare, which is what lets a
    // field be added without a version bump. The risk is that stripping is
    // silent, so what matters is that a smuggled field changed nothing.
    const response = await post('/v1/auth/sign-up', {
      ...CREDENTIALS,
      emailVerified: true,
      id: '00000000-0000-0000-0000-000000000000',
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.json().user.emailVerified, false);
    assert.notEqual(response.json().user.uid, '00000000-0000-0000-0000-000000000000');
  });
});

describe('sign-in', () => {
  it('returns a session for the right password', async () => {
    await signUp();
    const response = await post('/v1/auth/sign-in', {
      email: CREDENTIALS.email,
      password: CREDENTIALS.password,
    });

    assert.equal(response.statusCode, 200);
    assert.ok(response.json().accessToken);
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    await signUp();

    const wrongPassword = await post('/v1/auth/sign-in', {
      email: CREDENTIALS.email,
      password: 'not-the-password',
    });
    const noSuchAccount = await post('/v1/auth/sign-in', {
      email: 'nobody@example.com',
      password: 'not-the-password',
    });

    // Identical status and code: anything else lets a caller enumerate which
    // addresses have accounts.
    assert.equal(wrongPassword.statusCode, 401);
    assert.equal(noSuchAccount.statusCode, 401);
    assert.equal(wrongPassword.json().error.code, noSuchAccount.json().error.code);
    assert.equal(wrongPassword.json().error.message, noSuchAccount.json().error.message);
  });

  it('starts a separate session family from sign-up', async () => {
    const first = await signUp();
    const second = await post('/v1/auth/sign-in', {
      email: CREDENTIALS.email,
      password: CREDENTIALS.password,
    });

    const { rows } = await pool.query<{ count: number }>(
      'select count(distinct family_id)::int as count from refresh_tokens',
    );
    assert.equal(rows[0]!.count, 2, 'each sign-in is its own family');
    assert.notEqual(first.refreshToken, second.json().refreshToken);
  });
});

describe('refresh', () => {
  it('rotates the token and keeps the family', async () => {
    const session = await signUp();
    const response = await post('/v1/auth/refresh', { refreshToken: session.refreshToken });

    assert.equal(response.statusCode, 200);
    assert.notEqual(response.json().refreshToken, session.refreshToken);

    const { rows } = await pool.query<{ count: number }>(
      'select count(distinct family_id)::int as count from refresh_tokens',
    );
    assert.equal(rows[0]!.count, 1, 'a rotation continues one sign-in');
  });

  it('revokes the whole family when a consumed token is replayed', async () => {
    const session = await signUp();
    const rotated = await post('/v1/auth/refresh', { refreshToken: session.refreshToken });
    assert.equal(rotated.statusCode, 200);

    // The stolen copy of the original.
    const replay = await post('/v1/auth/refresh', { refreshToken: session.refreshToken });
    assert.equal(replay.statusCode, 401);
    assert.equal(replay.json().error.code, 'token_reused');

    // The legitimate holder is signed out too. That is the point: the two are
    // indistinguishable, so the safe move is to end both.
    const afterward = await post('/v1/auth/refresh', {
      refreshToken: rotated.json().refreshToken,
    });
    assert.equal(afterward.statusCode, 401);
  });

  it('rejects a token it has never seen', async () => {
    const response = await post('/v1/auth/refresh', { refreshToken: 'not-a-real-token' });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'token_invalid');
  });

  it('rejects an expired token', async () => {
    const session = await signUp();
    await pool.query("update refresh_tokens set expires_at = now() - interval '1 day'");

    const response = await post('/v1/auth/refresh', { refreshToken: session.refreshToken });
    assert.equal(response.json().error.code, 'token_expired');
  });
});

describe('sign-out', () => {
  it('ends the family and says nothing about unknown tokens', async () => {
    const session = await signUp();

    const out = await post('/v1/auth/sign-out', { refreshToken: session.refreshToken });
    assert.equal(out.statusCode, 204);

    const afterward = await post('/v1/auth/refresh', { refreshToken: session.refreshToken });
    assert.equal(afterward.statusCode, 401);

    // Signing out with a token that was never real looks identical.
    const unknown = await post('/v1/auth/sign-out', { refreshToken: 'never-existed' });
    assert.equal(unknown.statusCode, 204);
  });
});

describe('me', () => {
  it('returns the account for a valid access token', async () => {
    const session = await signUp();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().email, CREDENTIALS.email);
  });

  it('refuses a missing, malformed or forged token alike', async () => {
    const session = await signUp();

    for (const header of [
      undefined,
      'Bearer',
      'Basic abc',
      `Bearer ${session.accessToken}tampered`,
    ]) {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/me',
        ...(header ? { headers: { authorization: header } } : {}),
      });
      assert.equal(response.statusCode, 401, `expected 401 for ${header ?? 'no header'}`);
    }
  });
});
