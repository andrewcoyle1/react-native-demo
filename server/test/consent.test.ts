/**
 * `PUT /v1/profile/consent`.
 *
 * The property that matters and is easy to lose: consent is answerable *before*
 * a profile exists, because it is asked at the top of onboarding. Every other
 * route in this module requires one, so the temptation to make this one
 * consistent with its neighbours would break the only case it exists for.
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

const put = (token: string, analytics: unknown) =>
  app.inject({
    method: 'PUT',
    url: '/v1/profile/consent',
    headers: authed(token),
    payload: { analytics },
  });

describe('PUT /v1/profile/consent', () => {
  it('records consent for an account with no profile yet', async () => {
    const token = await signUp();

    const response = await put(token, 'granted');

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().analyticsConsent, 'granted');
    // The timestamp is the point: an answer without one demonstrates nothing.
    assert.ok(Date.parse(response.json().analyticsConsentAt) > 0);
  });

  it('overwrites a previous answer, so revoking sticks', async () => {
    const token = await signUp();

    await put(token, 'granted');
    const response = await put(token, 'denied');

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().analyticsConsent, 'denied');
  });

  it('refuses anything that is not a decision', async () => {
    const token = await signUp();

    // 'unasked' is a real state, but it is the absence of an answer rather than
    // one the athlete can give, so it must not be settable through the API.
    for (const value of ['unasked', '', null, 'GRANTED']) {
      const response = await put(token, value);
      // 422, the house code for a body the schema rejects — see `app.ts`.
      assert.equal(response.statusCode, 422, `accepted ${JSON.stringify(value)}`);
    }
  });

  it('refuses an unauthenticated request', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/profile/consent',
      payload: { analytics: 'granted' },
    });

    assert.equal(response.statusCode, 401, response.body);
  });

  it('keeps each account to its own answer', async () => {
    const first = await signUp('first@example.com');
    const second = await signUp('second@example.com');

    await put(first, 'granted');
    await put(second, 'denied');

    const { rows } = await pool.query<{ email: string; analytics_consent: string }>(
      'select email, analytics_consent from users order by email',
    );
    assert.deepEqual(
      rows.map(row => [row.email, row.analytics_consent]),
      [
        ['first@example.com', 'granted'],
        ['second@example.com', 'denied'],
      ],
    );
  });
});
