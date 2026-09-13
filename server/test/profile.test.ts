/**
 * `/v1/profile`.
 *
 * The rule under test throughout: a missing profile is a state, not a failure.
 * Everything else here is ownership — that the token decides whose profile is
 * read, and that a request cannot reach anyone else's.
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

describe('athlete metrics', () => {
  /** A profile has to exist before metrics can hang off it. */
  async function withProfile(email?: string): Promise<string> {
    const token = await signUp(email);
    const created = await app.inject({
      method: 'POST',
      url: '/v1/profile',
      headers: authed(token),
      payload: DRAFT,
    });
    assert.equal(created.statusCode, 201, created.body);
    return token;
  }

  const read = (token: string) =>
    app.inject({ method: 'GET', url: '/v1/profile/metrics', headers: authed(token) });

  const patch = (token: string, payload: Record<string, number | null>) =>
    app.inject({
      method: 'PATCH',
      url: '/v1/profile/metrics',
      headers: authed(token),
      payload,
    });

  it('answers a set of nulls rather than 404 before anything is recorded', async () => {
    // Unlike the profile itself, absent metrics are not a state the app has to
    // model: the figures are simply not set, which is what the screen shows.
    const response = await read(await withProfile());

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json(), {
      heightCm: null,
      weightKg: null,
      heartRateMin: null,
      heartRateMax: null,
      cyclingFtp: null,
      runPaceSecondsPerKm: null,
      swimPaceSecondsPer100m: null,
      modifiedAt: null,
    });
  });

  it('leaves the figures it was not given alone', async () => {
    // The whole reason this is not onboarding's `upsertMetrics`: editing one
    // figure from the profile screen must not blank the others beside it.
    const token = await withProfile();
    await patch(token, { heartRateMin: 42, heartRateMax: 188 });

    const response = await patch(token, { cyclingFtp: 260 });
    const body = response.json();

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(body.cyclingFtp, 260);
    assert.equal(body.heartRateMin, 42);
    assert.equal(body.heartRateMax, 188);
  });

  it('clears a figure given an explicit null', async () => {
    // Null and absent mean different things on this endpoint, which is what
    // lets the Clear button on the pace pickers work at all.
    const token = await withProfile();
    await patch(token, { cyclingFtp: 260, heartRateMin: 42 });

    const body = (await patch(token, { cyclingFtp: null })).json();

    assert.equal(body.cyclingFtp, null);
    assert.equal(body.heartRateMin, 42, 'clearing one figure must not clear another');
  });

  it('refuses a figure outside what the column allows', async () => {
    const response = await patch(await withProfile(), { heartRateMax: 900 });
    assert.equal(response.statusCode, 422, response.body);
  });

  it('refuses an empty patch rather than reporting a no-op as success', async () => {
    const response = await patch(await withProfile(), {});
    assert.equal(response.statusCode, 422, response.body);
  });

  it('will not write metrics for an account with no profile', async () => {
    const response = await patch(await signUp(), { cyclingFtp: 260 });
    assert.equal(response.statusCode, 404, response.body);
  });

  it('keeps one athlete out of another’s figures', async () => {
    const mine = await withProfile('mine@example.com');
    const theirs = await withProfile('theirs@example.com');

    await patch(mine, { cyclingFtp: 260 });
    await patch(theirs, { cyclingFtp: 180 });

    assert.equal((await read(mine)).json().cyclingFtp, 260);
    assert.equal((await read(theirs)).json().cyclingFtp, 180);
  });
});
