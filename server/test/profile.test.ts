/**
 * `/v1/profile`.
 *
 * The rule under test throughout: a missing profile is a state, not a failure.
 * Everything else here is ownership — that the token decides whose profile is
 * read, and that a request cannot reach anyone else's.
 */
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';

import { buildApp } from '../src/app.ts';
import { pool } from '../src/db.ts';
import { migrate } from '../src/migrate.ts';
import { resetDatabase } from './helpers.ts';

await migrate();
const app = buildApp();
await app.ready();

after(async () => {
  await app.close();
  await pool.end();
});

beforeEach(resetDatabase);

const DRAFT = {
  name: 'Sam Rivera',
  dateOfBirth: '1990-05-14',
  sex: 'other' as const,
  timezone: 'Europe/Dublin',
};

/** Signs a new account up and returns its access token. */
async function signUp(email = 'athlete@example.com'): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/sign-up',
    payload: { email, password: 'a-good-long-password', timezone: 'UTC' },
  });
  assert.equal(response.statusCode, 201, response.body);
  return response.json().accessToken;
}

const authed = (token: string) => ({ authorization: `Bearer ${token}` });

describe('reading a profile', () => {
  it('is 404 until one exists, which the app renders as absent', async () => {
    const token = await signUp();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/profile',
      headers: authed(token),
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, 'profile_not_found');
  });

  it('refuses without a token', async () => {
    await signUp();
    const response = await app.inject({ method: 'GET', url: '/v1/profile' });

    assert.equal(response.statusCode, 401);
  });
});

describe('creating a profile', () => {
  it('returns the stored document, dates as plain day strings', async () => {
    const token = await signUp();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/profile',
      headers: authed(token),
      payload: DRAFT,
    });

    assert.equal(response.statusCode, 201, response.body);
    const body = response.json();
    assert.equal(body.name, 'Sam Rivera');
    // Not an ISO instant: a birthday is a calendar day, and converting it into
    // a timezone is how it ends up a day early.
    assert.equal(body.dateOfBirth, '1990-05-14');
    assert.equal(body.units, 'metric', 'defaults rather than requiring a choice');
    assert.ok(body.createdAt);
  });

  it('moves the timezone onto the account, where the server can use it', async () => {
    const token = await signUp();
    await app.inject({ method: 'POST', url: '/v1/profile', headers: authed(token), payload: DRAFT });

    // Sign-up recorded UTC; creating the profile corrected it.
    const { rows } = await pool.query<{ timezone: string }>('select timezone from users');
    assert.equal(rows[0]!.timezone, 'Europe/Dublin');
  });

  it('refuses a second profile', async () => {
    const token = await signUp();
    await app.inject({ method: 'POST', url: '/v1/profile', headers: authed(token), payload: DRAFT });

    const again = await app.inject({
      method: 'POST',
      url: '/v1/profile',
      headers: authed(token),
      payload: DRAFT,
    });

    assert.equal(again.statusCode, 409);
    assert.equal(again.json().error.code, 'profile_exists');
  });

  it('rejects a malformed date and an unknown sex', async () => {
    const token = await signUp();

    for (const bad of [
      { ...DRAFT, dateOfBirth: '14/05/1990' },
      { ...DRAFT, sex: 'unknown' },
      { ...DRAFT, name: '' },
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/profile',
        headers: authed(token),
        payload: bad,
      });
      assert.equal(response.statusCode, 422, JSON.stringify(bad));
    }
  });
});

describe('updating a profile', () => {
  it('applies only the fields sent', async () => {
    const token = await signUp();
    await app.inject({ method: 'POST', url: '/v1/profile', headers: authed(token), payload: DRAFT });

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/profile',
      headers: authed(token),
      payload: { units: 'imperial' },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().units, 'imperial');
    assert.equal(response.json().name, 'Sam Rivera', 'untouched fields survive');
  });

  it('is 404 when there is nothing to update', async () => {
    const token = await signUp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/profile',
      headers: authed(token),
      payload: { name: 'Someone' },
    });

    assert.equal(response.statusCode, 404);
  });

  it('rejects an empty body rather than reporting a no-op as success', async () => {
    const token = await signUp();
    await app.inject({ method: 'POST', url: '/v1/profile', headers: authed(token), payload: DRAFT });

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/profile',
      headers: authed(token),
      payload: {},
    });

    assert.equal(response.statusCode, 422);
  });
});

describe('ownership', () => {
  it('reads only the profile belonging to the token', async () => {
    const mine = await signUp('mine@example.com');
    const theirs = await signUp('theirs@example.com');

    await app.inject({
      method: 'POST',
      url: '/v1/profile',
      headers: authed(mine),
      payload: { ...DRAFT, name: 'Mine' },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/profile',
      headers: authed(theirs),
      payload: { ...DRAFT, name: 'Theirs' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/profile',
      headers: authed(mine),
    });

    assert.equal(response.json().name, 'Mine');
  });
});
