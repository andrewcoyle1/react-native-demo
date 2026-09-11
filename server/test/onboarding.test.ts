/**
 * `POST /v1/onboarding/complete`.
 *
 * The rule under test: pressing "Personalise my plan" always leaves the
 * athlete with a saved profile, metrics, schedule and a real plan — and
 * calling it twice must not generate a second plan.
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

const authed = (token: string) => ({ authorization: `Bearer ${token}` });

async function signUp(email = 'athlete@example.com'): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/sign-up',
    payload: { email, password: 'a-good-long-password', timezone: 'UTC' },
  });
  assert.equal(response.statusCode, 201, response.body);
  return response.json().accessToken;
}

const REQUEST = {
  profile: { name: 'Sam Rivera', dateOfBirth: '1990-05-14', sex: 'other', timezone: 'Europe/Dublin' },
  units: 'metric',
  metrics: { heightCm: 178, weightKg: 71, heartRateMin: 48, heartRateMax: 190, runPaceSecondsPerKm: 330 },
  schedule: {
    availableMinutes: [0, 60, 0, 60, 0, 90, 120],
    commitments: [{ label: 'Weight Training', weekday: 2, discipline: 'weights' }],
  },
  race: {
    name: 'IRONMAN 70.3 Dublin',
    place: 'Dublin, IE',
    date: '2027-06-01',
    priority: 'A',
    targetSeconds: 5 * 3600,
    legs: [
      { discipline: 'swim', distanceMetres: 1900 },
      { discipline: 'ride', distanceMetres: 90000 },
      { discipline: 'run', distanceMetres: 21100 },
    ],
  },
  weeklyHours: 6,
};

describe('completing onboarding', () => {
  it('saves the profile, metrics and schedule, and generates a plan', async () => {
    const token = await signUp();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/onboarding/complete',
      headers: authed(token),
      payload: REQUEST,
    });

    assert.equal(response.statusCode, 201, response.body);
    const body = response.json();

    assert.equal(body.profile.name, 'Sam Rivera');
    assert.equal(body.metrics.heightCm, 178);
    assert.deepEqual(body.schedule.availableMinutes, REQUEST.schedule.availableMinutes);
    assert.equal(body.schedule.commitments.length, 1);
    assert.equal(body.race.name, 'IRONMAN 70.3 Dublin');
    assert.equal(body.race.legs.length, 3);
    assert.ok(body.plan.id);
    assert.equal(body.plan.name, 'Prep Plan');
    assert.equal(body.plan.status, 'current');
    assert.equal(body.plan.raceId, body.race.id);
    assert.equal(body.plan.weeklyPlannedHours.length, 12);
    assert.equal(body.plan.weeklyPlannedHours[0], 6);
    assert.ok(body.plan.artworkUrl);

    // One session per day with available minutes: four of the seven.
    const sessions = await pool.query('select count(*)::int as count from sessions where plan_id = $1', [
      body.plan.id,
    ]);
    assert.equal(sessions.rows[0].count, 4);
  });

  it('works with no goal race', async () => {
    const token = await signUp();
    const { race: _race, ...withoutRace } = REQUEST;

    const response = await app.inject({
      method: 'POST',
      url: '/v1/onboarding/complete',
      headers: authed(token),
      payload: withoutRace,
    });

    assert.equal(response.statusCode, 201, response.body);
    const body = response.json();
    assert.equal(body.race, null);
    assert.equal(body.plan.raceId, null);
  });

  it('is idempotent: a second call does not generate a second plan', async () => {
    const token = await signUp();

    const first = await app.inject({
      method: 'POST',
      url: '/v1/onboarding/complete',
      headers: authed(token),
      payload: REQUEST,
    });
    assert.equal(first.statusCode, 201, first.body);
    const firstPlanId = first.json().plan.id;

    const second = await app.inject({
      method: 'POST',
      url: '/v1/onboarding/complete',
      headers: authed(token),
      payload: { ...REQUEST, profile: { ...REQUEST.profile, name: 'Sam R. Rivera' } },
    });
    assert.equal(second.statusCode, 201, second.body);
    const body = second.json();

    assert.equal(body.plan.id, firstPlanId);
    assert.equal(body.profile.name, 'Sam R. Rivera');

    const plans = await pool.query('select count(*)::int as count from plans');
    assert.equal(plans.rows[0].count, 1);
  });

  it('refuses without a token', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/onboarding/complete', payload: REQUEST });
    assert.equal(response.statusCode, 401);
  });

  it('refuses an availability array that is not seven days', async () => {
    const token = await signUp();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/onboarding/complete',
      headers: authed(token),
      payload: { ...REQUEST, schedule: { ...REQUEST.schedule, availableMinutes: [60, 60] } },
    });
    assert.equal(response.statusCode, 422);
  });
});
