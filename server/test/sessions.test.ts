/**
 * `/v1/sessions`.
 *
 * Two properties carry the weight here: the window is bounded, and completion
 * is the only field a client can reach — including the timestamp, which the
 * server assigns so a wrong phone clock cannot backdate anything.
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

async function seedSession(
  uid: string,
  date: string,
  options: { position?: number; title?: string; withSegments?: boolean } = {},
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into sessions (user_id, date, position, title, discipline, purpose,
                           focus, equipment, duration_seconds, distance_metres,
                           estimated, chart_seconds, coach_name)
     values ($1, $2, $3, $4, 'swim', 'endurance',
             '{"Body position","Kicking"}', '{Snorkel}', 3420, 2700,
             true, 3420, 'Coach Greg')
     returning id`,
    [uid, date, options.position ?? 0, options.title ?? 'Chest Pressure Cooker'],
  );
  const id = rows[0]!.id;

  if (options.withSegments !== false) {
    await pool.query(
      `insert into session_segments
         (session_id, position, start_seconds, duration_seconds, intensity, zone, drill) values
         ($1, 0, 0,    480, 0.3,  'warmup', false),
         ($1, 1, 540,  360, 0.35, 'easy',   true),
         ($1, 2, 960, 2400, 0.95, 'swim',   false)`,
      [id],
    );
  }

  return id;
}

describe('reading a window', () => {
  it('returns sessions in the span, by day then position', async () => {
    const { token, uid } = await signUp();
    await seedSession(uid, '2026-09-09', { position: 1, title: 'Second' });
    await seedSession(uid, '2026-09-09', { position: 0, title: 'First' });
    await seedSession(uid, '2026-09-12', { title: 'Later' });
    await seedSession(uid, '2026-09-20', { title: 'Outside' });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/sessions?from=2026-09-08&to=2026-09-14',
      headers: authed(token),
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(
      response.json().map((s: { title: string }) => s.title),
      ['First', 'Second', 'Later'],
    );
  });

  it('carries segments in order, and dates as plain day strings', async () => {
    const { token, uid } = await signUp();
    await seedSession(uid, '2026-09-09');

    const [session] = (
      await app.inject({
        method: 'GET',
        url: '/v1/sessions?from=2026-09-09&to=2026-09-09',
        headers: authed(token),
      })
    ).json();

    assert.equal(session.date, '2026-09-09');
    assert.deepEqual(
      session.segments.map((s: { zone: string }) => s.zone),
      ['warmup', 'easy', 'swim'],
    );
    assert.equal(session.segments[1].drill, true);
    assert.deepEqual(session.focus, ['Body position', 'Kicking']);
    assert.equal(session.targets.distanceMetres, 2700);
    assert.equal(session.targets.estimated, true);
    // Absent targets are omitted rather than sent as null.
    assert.equal('load' in session.targets, false);
  });

  it('returns an empty segments array rather than null', async () => {
    const { token, uid } = await signUp();
    await seedSession(uid, '2026-09-09', { withSegments: false });

    const [session] = (
      await app.inject({
        method: 'GET',
        url: '/v1/sessions?from=2026-09-09&to=2026-09-09',
        headers: authed(token),
      })
    ).json();

    assert.deepEqual(session.segments, []);
  });

  it('requires a window rather than defaulting to everything', async () => {
    const { token } = await signUp();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/sessions',
      headers: authed(token),
    });

    assert.equal(response.statusCode, 422);
  });

  it('refuses a window wider than it will serve, and a backwards one', async () => {
    const { token } = await signUp();

    const tooWide = await app.inject({
      method: 'GET',
      url: '/v1/sessions?from=2020-01-01&to=2030-01-01',
      headers: authed(token),
    });
    assert.equal(tooWide.statusCode, 400);
    assert.equal(tooWide.json().error.code, 'window_too_wide');

    const backwards = await app.inject({
      method: 'GET',
      url: '/v1/sessions?from=2026-09-14&to=2026-09-08',
      headers: authed(token),
    });
    assert.equal(backwards.json().error.code, 'invalid_window');
  });

  it('shows an athlete only their own', async () => {
    const mine = await signUp('mine@example.com');
    const theirs = await signUp('theirs@example.com');
    await seedSession(theirs.uid, '2026-09-09');

    const response = await app.inject({
      method: 'GET',
      url: '/v1/sessions?from=2026-09-08&to=2026-09-14',
      headers: authed(mine.token),
    });
    assert.deepEqual(response.json(), []);
  });
});

describe('completion', () => {
  const complete = (token: string, id: string, completion: unknown) =>
    app.inject({
      method: 'PATCH',
      url: `/v1/sessions/${id}/completion`,
      headers: authed(token),
      payload: { completion },
    });

  it('marks a session complete and stamps it server-side', async () => {
    const { token, uid } = await signUp();
    const id = await seedSession(uid, '2026-09-09');

    const before = Date.now();
    const response = await complete(token, id, {});

    assert.equal(response.statusCode, 200, response.body);
    const stamped = Date.parse(response.json().completion.completedAt);
    assert.ok(stamped >= before - 1000, 'stamped now, not by the caller');
  });

  it('ignores a completedAt sent by the client', async () => {
    const { token, uid } = await signUp();
    const id = await seedSession(uid, '2026-09-09');

    const response = await complete(token, id, { completedAt: '1999-01-01T00:00:00.000Z' });

    // Stripped rather than rejected — docs/api.md says servers drop what they
    // do not declare. Stripping is silent, so what matters is that the smuggled
    // value changed nothing: the stamp is the server's clock, not 1999.
    assert.equal(response.statusCode, 200);
    assert.ok(
      Date.parse(response.json().completion.completedAt) > Date.parse('2020-01-01'),
      'the client cannot backdate a session',
    );
  });

  it('clears a completion when sent null', async () => {
    const { token, uid } = await signUp();
    const id = await seedSession(uid, '2026-09-09');

    await complete(token, id, {});
    const cleared = await complete(token, id, null);

    assert.equal(cleared.json().completion, null);
  });

  it('is idempotent, so a queued write can be replayed safely', async () => {
    const { token, uid } = await signUp();
    const id = await seedSession(uid, '2026-09-09');

    const first = await complete(token, id, {});
    const second = await complete(token, id, {});

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.ok(second.json().completion.completedAt);
  });

  it('cannot reach someone else’s session', async () => {
    const mine = await signUp('mine@example.com');
    const theirs = await signUp('theirs@example.com');
    const id = await seedSession(theirs.uid, '2026-09-09');

    const response = await complete(mine.token, id, {});

    // The same answer as a session that does not exist: no probing from here.
    assert.equal(response.statusCode, 404);

    const { rows } = await pool.query('select completed_at from sessions where id = $1', [id]);
    assert.equal(rows[0]!.completed_at, null, 'and it did not change');
  });

  it('has no route that creates or deletes one', async () => {
    const { token, uid } = await signUp();
    const id = await seedSession(uid, '2026-09-09');

    for (const [method, url] of [
      ['POST', '/v1/sessions'],
      ['DELETE', `/v1/sessions/${id}`],
      ['PATCH', `/v1/sessions/${id}`],
    ] as const) {
      const attempt = await app.inject({ method, url, headers: authed(token), payload: {} });
      assert.equal(attempt.statusCode, 404, `${method} ${url} should not exist`);
    }
  });
});
