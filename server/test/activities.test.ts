/**
 * `/v1/activities`.
 *
 * Paging carries most of the weight, and one case in particular: several
 * activities sharing an instant. A cursor on the timestamp alone silently drops
 * one of them, which is the whole reason the key is the pair.
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

async function seed(uid: string, startedAt: string, title: string) {
  await pool.query(
    `insert into activities (user_id, started_at, title, discipline, place, route,
                             sources, distance_metres, duration_seconds, pace_seconds_per_km)
     values ($1, $2, $3, 'run', 'Dublin, IE',
             '[{"x":0.1,"y":0.2},{"x":0.4,"y":0.5}]'::jsonb,
             '{linked,uploaded}', 5900, 1983, 336)`,
    [uid, startedAt, title],
  );
}

/** Walks every page and returns the titles, in order. */
async function walk(token: string, limit: number): Promise<string[]> {
  const titles: string[] = [];
  let cursor: string | null = null;
  let guard = 0;

  do {
    const query: string = cursor
      ? `?limit=${limit}&cursor=${encodeURIComponent(cursor)}`
      : `?limit=${limit}`;
    const page = (
      await app.inject({ method: 'GET', url: `/v1/activities${query}`, headers: authed(token) })
    ).json();

    titles.push(...page.items.map((a: { title: string }) => a.title));
    cursor = page.cursor;

    guard += 1;
    assert.ok(guard < 50, 'paging did not terminate');
  } while (cursor);

  return titles;
}

describe('paging', () => {
  it('returns newest first and reports the end with a null cursor', async () => {
    const { token, uid } = await signUp();
    await seed(uid, '2026-09-08T09:00:00Z', 'Older');
    await seed(uid, '2026-09-10T09:00:00Z', 'Newer');

    const page = (
      await app.inject({ method: 'GET', url: '/v1/activities', headers: authed(token) })
    ).json();

    assert.deepEqual(
      page.items.map((a: { title: string }) => a.title),
      ['Newer', 'Older'],
    );
    assert.equal(page.cursor, null);
  });

  it('walks the whole history exactly once across pages', async () => {
    const { token, uid } = await signUp();
    for (let index = 0; index < 7; index += 1) {
      await seed(uid, `2026-09-${String(10 - index).padStart(2, '0')}T09:00:00Z`, `A${index}`);
    }

    const titles = await walk(token, 3);

    assert.deepEqual(titles, ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
    assert.equal(new Set(titles).size, titles.length, 'nothing repeated');
  });

  it('does not drop activities that share an instant', async () => {
    const { token, uid } = await signUp();
    // A bulk import from a watch: four rows, one timestamp.
    for (const title of ['S1', 'S2', 'S3', 'S4']) {
      await seed(uid, '2026-09-10T09:00:00Z', title);
    }

    const titles = await walk(token, 2);

    // A cursor on started_at alone would lose one at each page boundary.
    assert.equal(titles.length, 4, `expected all four, got ${titles.join(', ')}`);
    assert.deepEqual([...titles].sort(), ['S1', 'S2', 'S3', 'S4']);
  });

  it('is unaffected by an insert during the walk', async () => {
    const { token, uid } = await signUp();
    for (let index = 0; index < 4; index += 1) {
      await seed(uid, `2026-09-0${4 - index}T09:00:00Z`, `A${index}`);
    }

    const first = (
      await app.inject({ method: 'GET', url: '/v1/activities?limit=2', headers: authed(token) })
    ).json();

    // Something syncs while the athlete is scrolling.
    await seed(uid, '2026-09-20T09:00:00Z', 'Arrived');

    const second = (
      await app.inject({
        method: 'GET',
        url: `/v1/activities?limit=2&cursor=${encodeURIComponent(first.cursor)}`,
        headers: authed(token),
      })
    ).json();

    // OFFSET would have shifted everything down and repeated a row here.
    assert.deepEqual(
      second.items.map((a: { title: string }) => a.title),
      ['A2', 'A3'],
    );
  });

  it('treats the cursor as opaque and rejects nothing it handed out', async () => {
    const { token, uid } = await signUp();
    await seed(uid, '2026-09-10T09:00:00Z', 'One');
    await seed(uid, '2026-09-09T09:00:00Z', 'Two');

    const page = (
      await app.inject({ method: 'GET', url: '/v1/activities?limit=1', headers: authed(token) })
    ).json();

    assert.match(page.cursor, /^\d+:[0-9a-f-]{36}$/);
  });

  it('shows an athlete only their own', async () => {
    const mine = await signUp('mine@example.com');
    const theirs = await signUp('theirs@example.com');
    await seed(theirs.uid, '2026-09-10T09:00:00Z', 'Theirs');

    const page = (
      await app.inject({ method: 'GET', url: '/v1/activities', headers: authed(mine.token) })
    ).json();

    assert.deepEqual(page.items, []);
  });
});

describe('the windowed form', () => {
  it('returns a plain array for a span of days', async () => {
    const { token, uid } = await signUp();
    await seed(uid, '2026-09-07T09:00:00Z', 'Inside');
    await seed(uid, '2026-09-13T23:30:00Z', 'Last day, late');
    await seed(uid, '2026-09-14T09:00:00Z', 'Outside');

    const response = await app.inject({
      method: 'GET',
      url: '/v1/activities?from=2026-09-07&to=2026-09-13',
      headers: authed(token),
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(
      response.json().map((a: { title: string }) => a.title),
      ['Last day, late', 'Inside'],
      'the upper bound includes the whole day',
    );
  });

  it('refuses a window and a page at once', async () => {
    const { token } = await signUp();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/activities?from=2026-09-07&to=2026-09-13&limit=5',
      headers: authed(token),
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'invalid_query');
  });

  it('needs both ends of a window', async () => {
    const { token } = await signUp();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/activities?from=2026-09-07',
      headers: authed(token),
    });

    assert.equal(response.json().error.code, 'invalid_window');
  });
});

describe('shape', () => {
  it('carries the route and stats, omitting figures that were not recorded', async () => {
    const { token, uid } = await signUp();
    await seed(uid, '2026-09-10T09:00:00Z', 'Run');

    const [activity] = (
      await app.inject({ method: 'GET', url: '/v1/activities', headers: authed(token) })
    ).json().items;

    assert.deepEqual(activity.route, [
      { x: 0.1, y: 0.2 },
      { x: 0.4, y: 0.5 },
    ]);
    assert.deepEqual(activity.sources, ['linked', 'uploaded']);
    assert.equal(activity.stats.distanceMetres, 5900);
    assert.equal('calories' in activity.stats, false);
    // An instant, not a day key.
    assert.match(activity.startedAt, /^2026-09-10T09:00:00/);
  });

  it('has no route that writes one', async () => {
    const { token } = await signUp();

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      const attempt = await app.inject({
        method,
        url: '/v1/activities',
        headers: authed(token),
        payload: {},
      });
      assert.equal(attempt.statusCode, 404, `${method} should not exist`);
    }
  });
});
