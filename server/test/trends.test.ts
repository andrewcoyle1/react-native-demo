/**
 * `/v1/trends`.
 *
 * The volume half is a sum and largely tests itself. The fitness half is a
 * recursive query computing an exponentially weighted average, which is the
 * kind of thing that looks right and is not — so it is checked against the
 * arithmetic it claims to be doing.
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

async function signUp(email = 'athlete@example.com') {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/sign-up',
    payload: { email, password: 'a-good-long-password', timezone: 'UTC' },
  });
  return { token: response.json().accessToken as string, uid: response.json().user.uid as string };
}

const authed = (token: string) => ({ authorization: `Bearer ${token}` });

/** Days before `to`, as a day key. */
function daysBefore(to: string, days: number): string {
  const date = new Date(`${to}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const TO = '2026-09-13';
const FROM = '2026-09-07';

async function plannedSession(uid: string, date: string, seconds: number, metres: number) {
  await pool.query(
    `insert into sessions (user_id, date, position, title, discipline,
                           duration_seconds, distance_metres)
     values ($1, $2, (select coalesce(max(position), -1) + 1 from sessions
                       where user_id = $1 and date = $2),
             'Planned', 'run', $3, $4)`,
    [uid, date, seconds, metres],
  );
}

async function recorded(
  uid: string,
  day: string,
  options: { seconds?: number; metres?: number; load?: number } = {},
) {
  await pool.query(
    `insert into activities (user_id, started_at, title, discipline,
                             duration_seconds, distance_metres, load)
     values ($1, ($2::date + interval '9 hours')::timestamptz, 'Recorded', 'run', $3, $4, $5)`,
    [uid, day, options.seconds ?? null, options.metres ?? null, options.load ?? null],
  );
}

const read = (token: string, from = FROM, to = TO) =>
  app.inject({ method: 'GET', url: `/v1/trends?from=${from}&to=${to}`, headers: authed(token) });

describe('volume', () => {
  it('sums planned and completed separately', async () => {
    const { token, uid } = await signUp();
    await plannedSession(uid, '2026-09-08', 3600, 10_000);
    await plannedSession(uid, '2026-09-09', 1800, 5_000);
    await recorded(uid, '2026-09-08', { seconds: 3400, metres: 9_500 });

    const trends = (await read(token)).json();

    assert.deepEqual(trends.planned, { durationSeconds: 5400, distanceMetres: 15_000 });
    assert.deepEqual(trends.completed, { durationSeconds: 3400, distanceMetres: 9_500 });
  });

  it('counts nothing outside the window', async () => {
    const { token, uid } = await signUp();
    await plannedSession(uid, '2026-09-06', 3600, 10_000);
    await plannedSession(uid, '2026-09-14', 3600, 10_000);
    await recorded(uid, '2026-09-14', { seconds: 3600, metres: 10_000 });

    const trends = (await read(token)).json();

    assert.deepEqual(trends.planned, { durationSeconds: 0, distanceMetres: 0 });
    assert.deepEqual(trends.completed, { durationSeconds: 0, distanceMetres: 0 });
  });

  it('reports zero rather than null for an athlete with nothing', async () => {
    const { token } = await signUp();
    const trends = (await read(token)).json();

    assert.deepEqual(trends.planned, { durationSeconds: 0, distanceMetres: 0 });
    assert.equal(trends.fitness.value, 0);
  });
});

describe('fitness and fatigue', () => {
  it('matches the exponentially weighted average it claims to compute', async () => {
    const { token, uid } = await signUp();

    // One load of 10, exactly 6 days before the end of the window. Fatigue
    // decays over 7 days, fitness over 42, from the day it lands.
    await recorded(uid, daysBefore(TO, 6), { load: 10 });

    const trends = (await read(token)).json();

    // Reference implementation of the same recurrence, in the clear.
    let fitness = 0;
    let fatigue = 0;
    for (let day = 6; day >= 0; day -= 1) {
      const load = day === 6 ? 10 : 0;
      fitness += (load - fitness) / 42;
      fatigue += (load - fatigue) / 7;
    }

    assert.equal(trends.fitness.value, Math.round(fitness * 10) / 10);
    assert.equal(trends.fatigue.value, Math.round(fatigue * 10) / 10);
  });

  it('makes fatigue respond faster than fitness to the same work', async () => {
    const { token, uid } = await signUp();
    for (let day = 0; day < 7; day += 1) {
      await recorded(uid, daysBefore(TO, day), { load: 8 });
    }

    const trends = (await read(token)).json();

    assert.ok(
      trends.fatigue.value > trends.fitness.value,
      `a hard week should leave fatigue above fitness, got ${trends.fatigue.value} vs ${trends.fitness.value}`,
    );
    // Which is what makes form negative: the athlete is buried, not fresh.
    assert.ok(trends.form.value < 0, `form should be negative, got ${trends.form.value}`);
  });

  it('lets form climb through a taper', async () => {
    const { token, uid } = await signUp();

    // A solid block, then eleven days easy.
    for (let day = 12; day < 40; day += 1) {
      await recorded(uid, daysBefore(TO, day), { load: 7 });
    }

    const trends = (await read(token)).json();

    // Fatigue has decayed while fitness has not, which is the whole point of a
    // taper — and the reason form is worth showing at all.
    assert.ok(trends.fitness.value > trends.fatigue.value);
    assert.ok(trends.form.value > 0, `form should be positive, got ${trends.form.value}`);
    assert.equal(trends.form.direction, 'up');
  });

  it('counts a rest day as a zero rather than skipping it', async () => {
    const { token, uid } = await signUp();
    await recorded(uid, daysBefore(TO, 30), { load: 10 });

    const trends = (await read(token)).json();

    // Thirty days of nothing must decay the average. If the query joined
    // instead of walking a calendar, this would still read as the day it landed.
    assert.ok(
      trends.fatigue.value < 0.1,
      `fatigue should have decayed away, got ${trends.fatigue.value}`,
    );
  });

  it('sees only this athlete’s load', async () => {
    const mine = await signUp('mine@example.com');
    const theirs = await signUp('theirs@example.com');
    for (let day = 0; day < 7; day += 1) {
      await recorded(theirs.uid, daysBefore(TO, day), { load: 9 });
    }

    const trends = (await read(mine.token)).json();
    assert.equal(trends.fitness.value, 0);
  });
});

describe('the window', () => {
  it('requires both ends and refuses an absurd span', async () => {
    const { token } = await signUp();

    const missing = await app.inject({
      method: 'GET',
      url: '/v1/trends?from=2026-09-07',
      headers: authed(token),
    });
    assert.equal(missing.statusCode, 422);

    const wide = await read(token, '2020-01-01', '2030-01-01');
    assert.equal(wide.json().error.code, 'window_too_wide');
  });
});
