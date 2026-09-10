/**
 * The SQL behind `/v1/activities`.
 *
 * The interesting part is the cursor. Paging is keyset, not OFFSET: a walk
 * through history with OFFSET skips or repeats rows whenever something is
 * inserted underneath it, and syncing a watch inserts plenty.
 *
 * The key is the pair `(started_at, id)`, not the timestamp alone. Two
 * activities can share an instant — a bulk import gives several the same
 * stamp — and a cursor on the timestamp alone would silently drop one.
 */
import type pg from 'pg';

import type { ActivityDTO, ActivitySource, RoutePointDTO } from '../domain.ts';

type Queryable = pg.PoolClient | pg.Pool;

type ActivityRow = {
  id: string;
  started_at: Date;
  title: string;
  discipline: ActivityDTO['discipline'];
  place: string | null;
  route: RoutePointDTO[];
  sources: ActivitySource[];
  distance_metres: number | null;
  duration_seconds: number | null;
  pace_seconds_per_km: number | null;
  average_heart_rate: number | null;
  calories: number | null;
  session_id: string | null;
};

const COLUMNS = `id, started_at, title, discipline, place, route, sources,
                 distance_metres, duration_seconds, pace_seconds_per_km,
                 average_heart_rate, calories, session_id`;

function toActivityDTO(row: ActivityRow): ActivityDTO {
  return {
    id: row.id,
    startedAt: row.started_at.toISOString(),
    title: row.title,
    discipline: row.discipline,
    place: row.place,
    route: row.route,
    sources: row.sources,
    stats: {
      ...(row.distance_metres !== null ? { distanceMetres: row.distance_metres } : {}),
      ...(row.duration_seconds !== null ? { durationSeconds: row.duration_seconds } : {}),
      ...(row.pace_seconds_per_km !== null ? { paceSecondsPerKm: row.pace_seconds_per_km } : {}),
      ...(row.average_heart_rate !== null ? { averageHeartRate: row.average_heart_rate } : {}),
      ...(row.calories !== null ? { calories: row.calories } : {}),
    },
    sessionId: row.session_id,
  };
}

/**
 * The cursor, as the client sees it: an opaque string.
 *
 * `<epoch millis>:<uuid>` today. The client passes back what it was given and
 * parses nothing, so this encoding can change without a version bump.
 */
export function encodeCursor(activity: ActivityDTO): string {
  return `${Date.parse(activity.startedAt)}:${activity.id}`;
}

function decodeCursor(cursor: string): { startedAt: Date; id: string } | null {
  const separator = cursor.indexOf(':');
  if (separator < 0) {
    return null;
  }

  const millis = Number(cursor.slice(0, separator));
  const id = cursor.slice(separator + 1);

  if (!Number.isFinite(millis) || !id) {
    return null;
  }

  return { startedAt: new Date(millis), id };
}

export type Page = { items: ActivityDTO[]; cursor: string | null };

/** One page of history, newest first. */
export async function findPage(
  userId: string,
  cursor: string | null,
  limit: number,
  db: Queryable,
): Promise<Page> {
  const after = cursor ? decodeCursor(cursor) : null;

  /*
   * Row-value comparison, which Postgres understands as a single ordered
   * predicate and can satisfy from the index directly — rather than the
   * `started_at < x or (started_at = x and id < y)` it would otherwise take.
   */
  const { rows } = await db.query<ActivityRow>(
    `select ${COLUMNS}
       from activities
      where user_id = $1
        ${after ? 'and (started_at, id) < ($3::timestamptz, $4::uuid)' : ''}
      order by started_at desc, id desc
      limit $2`,
    after ? [userId, limit, after.startedAt, after.id] : [userId, limit],
  );

  const items = rows.map(toActivityDTO);
  const last = items.at(-1);

  return {
    items,
    // A short page is the end. Anything else and the next cursor is the last
    // row we handed out.
    cursor: items.length < limit || !last ? null : encodeCursor(last),
  };
}

/**
 * Activities within a span of days, newest first.
 *
 * The Plan tab's read: it sets one week of recorded work against one week of
 * planned work, and paging backwards to reach an old week would be both slow
 * and wrong.
 */
export async function findWindow(
  userId: string,
  from: string,
  to: string,
  db: Queryable,
): Promise<ActivityDTO[]> {
  /*
   * Half-open on the upper bound, in the athlete's own timezone. `started_at`
   * is an instant, the window is calendar days, and the conversion has to
   * happen somewhere — doing it here means the index still does the work.
   */
  const { rows } = await db.query<ActivityRow>(
    `select ${COLUMNS}
       from activities a
      where a.user_id = $1
        and a.started_at >= ($2::date)::timestamptz
        and a.started_at <  (($3::date) + 1)::timestamptz
      order by a.started_at desc, a.id desc`,
    [userId, from, to],
  );

  return rows.map(toActivityDTO);
}
