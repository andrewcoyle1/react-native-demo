/**
 * Plans, races and the schedule.
 *
 * The two properties worth pinning: plans and races have no write route at all,
 * and a schedule write is atomic across the two tables it spans.
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

  it('has no route that edits one', async () => {
    const { token } = await signUp();

    /*
     * The invariant this guards has narrowed rather than gone: the athlete can
     * now add a plan (POST) and empty the collection (DELETE), but a plan's
     * weeks, sessions and progress are still the backend's to author, so
     * nothing may edit one in place. Both writes create or destroy whole
     * plans; neither reaches inside one.
     */
    for (const method of ['PUT', 'PATCH'] as const) {
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

describe('resetting plans', () => {
  it('deletes every plan regardless of status', async () => {
    const { token, uid } = await signUp();
    await seedPlanAndRace(uid);

    const reset = await app.inject({ method: 'DELETE', url: '/v1/plans', headers: authed(token) });
    assert.equal(reset.statusCode, 204);

    const { rows } = await pool.query('select count(*)::int as n from plans where user_id = $1', [
      uid,
    ]);
    assert.equal(rows[0]!.n, 0);
  });

  it('cascades to the sessions those plans generated', async () => {
    const { token, uid } = await signUp();
    await seedPlanAndRace(uid);

    const { rows: planRows } = await pool.query<{ id: string }>(
      `select id from plans where user_id = $1 and status = 'current'`,
      [uid],
    );
    const planId = planRows[0]!.id;

    await pool.query(
      `insert into sessions (user_id, plan_id, date, title, discipline)
       values ($1, $2, '2026-09-10', 'Easy run', 'run')`,
      [uid, planId],
    );

    await app.inject({ method: 'DELETE', url: '/v1/plans', headers: authed(token) });

    const { rows } = await pool.query('select count(*)::int as n from sessions where user_id = $1', [
      uid,
    ]);
    assert.equal(rows[0]!.n, 0);
  });

  it('leaves races and recorded activities alone, unlinking the activity from its session', async () => {
    const { token, uid } = await signUp();
    const raceId = await seedPlanAndRace(uid);

    const { rows: planRows } = await pool.query<{ id: string }>(
      `select id from plans where user_id = $1 and status = 'current'`,
      [uid],
    );
    const planId = planRows[0]!.id;

    const { rows: sessionRows } = await pool.query<{ id: string }>(
      `insert into sessions (user_id, plan_id, date, title, discipline)
       values ($1, $2, '2026-09-10', 'Easy run', 'run')
       returning id`,
      [uid, planId],
    );
    const sessionId = sessionRows[0]!.id;

    await pool.query(
      `insert into activities (user_id, session_id, started_at, title, discipline)
       values ($1, $2, now(), 'Morning run', 'run')`,
      [uid, sessionId],
    );

    await app.inject({ method: 'DELETE', url: '/v1/plans', headers: authed(token) });

    const races = (
      await app.inject({ method: 'GET', url: '/v1/races', headers: authed(token) })
    ).json();
    assert.deepEqual(
      races.map((r: { id: string }) => r.id),
      [raceId],
    );

    const { rows: activityRows } = await pool.query<{ session_id: string | null }>(
      'select session_id from activities where user_id = $1',
      [uid],
    );
    assert.equal(activityRows.length, 1);
    assert.equal(activityRows[0]!.session_id, null);
  });

  it('requires authentication', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/v1/plans' });
    assert.equal(response.statusCode, 401);
  });

  it("does not touch another athlete's plans", async () => {
    const mine = await signUp('mine@example.com');
    const theirs = await signUp('theirs@example.com');
    await seedPlanAndRace(theirs.uid);

    await app.inject({ method: 'DELETE', url: '/v1/plans', headers: authed(mine.token) });

    const { rows } = await pool.query('select count(*)::int as n from plans where user_id = $1', [
      theirs.uid,
    ]);
    assert.equal(rows[0]!.n, 3);
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

describe('adding a plan', () => {
  /** An athlete who has been through onboarding: a schedule, and nothing else. */
  async function seedSchedule(uid: string, availableMinutes = [0, 60, 60, 0, 60, 0, 120]) {
    await pool.query(
      'insert into schedules (user_id, available_minutes) values ($1, $2)',
      [uid, availableMinutes],
    );
  }

  const RACE = {
    name: 'Dublin Marathon',
    place: 'Dublin, IE',
    date: '2027-10-25',
    priority: 'A',
    targetSeconds: 12600,
    legs: [{ discipline: 'run', distanceMetres: 42195 }],
  };

  async function addPlan(token: string, race: unknown = null) {
    return app.inject({
      method: 'POST',
      url: '/v1/plans',
      headers: authed(token),
      payload: { race },
    });
  }

  it('creates the first plan as current', async () => {
    const { token, uid } = await signUp();
    await seedSchedule(uid);

    const response = await addPlan(token, RACE);

    assert.equal(response.statusCode, 201, response.body);
    assert.equal(response.json().status, 'current');
    assert.equal(response.json().weeks, 12);
  });

  it('queues a second plan behind the first rather than replacing it', async () => {
    const { token, uid } = await signUp();
    await seedSchedule(uid);

    const first = await addPlan(token, null);
    const second = await addPlan(token, RACE);

    assert.equal(second.statusCode, 201, second.body);
    assert.equal(second.json().status, 'upcoming');

    /*
     * The whole point of queueing: an athlete six weeks into a build has not
     * stopped wanting it because they added a race in the spring.
     */
    const plans = await app.inject({ method: 'GET', url: '/v1/plans', headers: authed(token) });
    assert.deepEqual(
      plans.json().map((plan: { status: string }) => plan.status),
      ['current', 'upcoming'],
    );

    // And it starts the day the current one ends, with no gap and no overlap.
    const { endDate } = first.json();
    const dayAfter = new Date(`${endDate}T00:00:00Z`);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    assert.equal(second.json().startDate, dayAfter.toISOString().slice(0, 10));
  });

  it('queues a third behind the second, not behind the current one', async () => {
    const { token, uid } = await signUp();
    await seedSchedule(uid);

    await addPlan(token, null);
    const second = await addPlan(token, null);
    const third = await addPlan(token, null);

    // Both would otherwise claim the same weeks.
    assert.ok(third.json().startDate > second.json().startDate, 'third must follow the second');
  });

  it('generates an opening week from the stored schedule', async () => {
    const { token, uid } = await signUp();
    // Two days with time in them, so two sessions and no more.
    await seedSchedule(uid, [0, 60, 0, 0, 90, 0, 0]);

    const plan = await addPlan(token, null);
    const { rows } = await pool.query<{ count: string }>(
      'select count(*) from sessions where plan_id = $1',
      [plan.json().id],
    );

    assert.equal(rows[0]!.count, '2');
  });

  it('attaches the race when there is one, and none when there is not', async () => {
    const withRace = await signUp('race@example.com');
    await seedSchedule(withRace.uid);
    const planned = await addPlan(withRace.token, RACE);
    assert.ok(planned.json().raceId, 'expected a race id');

    const openGoal = await signUp('goal@example.com');
    await seedSchedule(openGoal.uid);
    const open = await addPlan(openGoal.token, null);
    assert.equal(open.json().raceId, null);
  });

  it('refuses an athlete with no schedule', async () => {
    const { token } = await signUp();

    // Unreachable from the app, but a plan generated against a schedule the
    // athlete has never seen would be a plan they never agreed to.
    const response = await addPlan(token, null);
    assert.equal(response.statusCode, 400, response.body);
    assert.equal(response.json().error.code, 'no_schedule');
  });

  it('validates the race exactly as onboarding does', async () => {
    const { token, uid } = await signUp();
    await seedSchedule(uid);

    const response = await addPlan(token, { ...RACE, priority: 'Z' });
    assert.equal(response.statusCode, 422, response.body);
  });

  it('needs a token', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/plans', payload: { race: null } });
    assert.equal(response.statusCode, 401, response.body);
  });
});
