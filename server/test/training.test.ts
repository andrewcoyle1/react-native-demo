/**
 * Plans, races and the schedule.
 *
 * The two properties worth pinning: plans and races have no write route at all,
 * and a schedule write is atomic across the two tables it spans.
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
    payload: { email, password: 'a-good-long-password', timezone: 'Europe/Dublin' },
  });
  return { token: response.json().accessToken as string, uid: response.json().user.uid as string };
}

const authed = (token: string) => ({ authorization: `Bearer ${token}` });

/** Inserts what the backend would generate, since nothing generates it yet. */
async function seedPlanAndRace(uid: string) {
  const { rows } = await pool.query<{ id: string }>(
    `insert into races (user_id, name, place, date, priority, target_seconds)
     values ($1, 'IRONMAN 70.3 Luxembourg', 'Moselle, Luxembourg', '2027-07-11', 'A', 18480)
     returning id`,
    [uid],
  );
  const raceId = rows[0]!.id;

  await pool.query(
    `insert into race_legs (race_id, position, discipline, distance_metres) values
       ($1, 0, 'swim', 1900), ($1, 1, 'ride', 90000), ($1, 2, 'run', 21100)`,
    [raceId],
  );

  await pool.query(
    `insert into plans (user_id, race_id, name, status, phase, start_date, end_date,
                        weeks, weekly_planned_hours, current_week_index, current_week_progress)
     values ($1, $2, 'Prep Plan', 'current', 'Base Phase', '2026-09-02', '2027-02-21',
             24, '{8,9,7,10}', 1, 0.35),
            ($1, $2, 'Race Plan', 'upcoming', null, '2027-02-22', '2027-07-11',
             20, '{6,9,7,11}', null, null),
            ($1, $2, 'Old Plan', 'complete', null, '2026-01-01', '2026-06-01',
             12, '{5}', null, null)`,
    [uid, raceId],
  );

  return raceId;
}

describe('plans', () => {
  it('returns current and upcoming, in start order, and hides completed', async () => {
    const { token, uid } = await signUp();
    await seedPlanAndRace(uid);

    const response = await app.inject({ method: 'GET', url: '/v1/plans', headers: authed(token) });

    assert.equal(response.statusCode, 200);
    const plans = response.json();
    assert.deepEqual(
      plans.map((p: { name: string }) => p.name),
      ['Prep Plan', 'Race Plan'],
    );
  });

  it('returns completed plans only when asked', async () => {
    const { token, uid } = await signUp();
    await seedPlanAndRace(uid);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/plans?status=complete',
      headers: authed(token),
    });

    assert.deepEqual(
      response.json().map((p: { name: string }) => p.name),
      ['Old Plan'],
    );
  });

  it('carries the weekly hours array through as numbers', async () => {
    const { token, uid } = await signUp();
    await seedPlanAndRace(uid);

    const [current] = (
      await app.inject({ method: 'GET', url: '/v1/plans', headers: authed(token) })
    ).json();
    assert.deepEqual(current.weeklyPlannedHours, [8, 9, 7, 10]);
    assert.equal(current.currentWeekIndex, 1);
    assert.equal(current.currentWeekProgress, 0.35);
    // A plain day string, not an instant.
    assert.equal(current.startDate, '2026-09-02');
  });

  it('has no route that writes one', async () => {
    const { token } = await signUp();

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      const attempt = await app.inject({
        method,
        url: '/v1/plans',
        headers: authed(token),
        payload: {},
      });
      assert.equal(attempt.statusCode, 404, `${method} should not exist`);
    }
  });

  it('shows an athlete only their own', async () => {
    const mine = await signUp('mine@example.com');
    const theirs = await signUp('theirs@example.com');
    await seedPlanAndRace(theirs.uid);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/plans',
      headers: authed(mine.token),
    });
    assert.deepEqual(response.json(), []);
  });
});

describe('races', () => {
  it('returns legs in race order', async () => {
    const { token, uid } = await signUp();
    await seedPlanAndRace(uid);

    const races = (
      await app.inject({ method: 'GET', url: '/v1/races', headers: authed(token) })
    ).json();

    assert.equal(races.length, 1);
    assert.deepEqual(
      races[0].legs.map((leg: { discipline: string }) => leg.discipline),
      ['swim', 'ride', 'run'],
    );
    assert.equal(races[0].legs[0].distanceMetres, 1900);
    assert.equal(races[0].targetSeconds, 18480);
  });

  it('returns an empty legs array rather than null for a race with none', async () => {
    const { token, uid } = await signUp();
    await pool.query(
      `insert into races (user_id, name, date, priority)
       values ($1, 'Parkrun', '2026-10-01', 'C')`,
      [uid],
    );

    const races = (
      await app.inject({ method: 'GET', url: '/v1/races', headers: authed(token) })
    ).json();
    assert.deepEqual(races[0].legs, []);
  });
});

describe('schedule', () => {
  const AVAILABILITY = [180, 60, 90, 60, 90, 60, 240];

  it('is 404 until set', async () => {
    const { token } = await signUp();
    const read = await app.inject({ method: 'GET', url: '/v1/schedule', headers: authed(token) });

    assert.equal(read.statusCode, 404);
    assert.equal(read.json().error.code, 'schedule_not_found');
  });

  it('is created by the first write', async () => {
    const { token } = await signUp();
    const written = await app.inject({
      method: 'PUT',
      url: '/v1/schedule',
      headers: authed(token),
      payload: { availableMinutes: AVAILABILITY },
    });

    assert.equal(written.statusCode, 200, written.body);
    assert.deepEqual(written.json().availableMinutes, AVAILABILITY);
    assert.deepEqual(written.json().commitments, []);
  });

  it('replaces commitments wholesale and assigns their ids', async () => {
    const { token } = await signUp();
    await app.inject({
      method: 'PUT',
      url: '/v1/schedule',
      headers: authed(token),
      payload: {
        availableMinutes: AVAILABILITY,
        commitments: [
          { label: 'Weight Training', weekday: 1, discipline: 'weights' },
          { label: 'Club Swim', weekday: 3, discipline: 'swim' },
        ],
      },
    });

    const replaced = await app.inject({
      method: 'PUT',
      url: '/v1/schedule',
      headers: authed(token),
      payload: { commitments: [{ label: 'Yoga', weekday: 5, discipline: null }] },
    });

    const commitments = replaced.json().commitments;
    assert.equal(commitments.length, 1, 'the previous two are gone');
    assert.equal(commitments[0].label, 'Yoga');
    assert.ok(commitments[0].id, 'the server assigns the id');
    // Availability was not sent, so it survived.
    assert.deepEqual(replaced.json().availableMinutes, AVAILABILITY);
  });

  it('rejects an availability array that is not seven days', async () => {
    const { token } = await signUp();

    for (const availableMinutes of [[60], Array(8).fill(60)]) {
      const response_ = await app.inject({
        method: 'PUT',
        url: '/v1/schedule',
        headers: authed(token),
        payload: { availableMinutes },
      });
      assert.equal(response_.statusCode, 422);
    }
  });

  it('refuses commitments before there is a schedule to hang them on', async () => {
    const { token } = await signUp();
    const response_ = await app.inject({
      method: 'PUT',
      url: '/v1/schedule',
      headers: authed(token),
      payload: { commitments: [{ label: 'Yoga', weekday: 5 }] },
    });

    assert.equal(response_.statusCode, 404);
  });
});
