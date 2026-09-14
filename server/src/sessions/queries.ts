/**
 * The SQL behind `/v1/sessions`.
 *
 * One query returns a whole window with its segments, aggregated per session
 * rather than fetched per row — a week is a handful of sessions but a hundred
 * segments, and N+1 there would be felt.
 */
import type pg from 'pg';

import type { SegmentDTO, SessionDTO } from '../domain.ts';

type Queryable = pg.PoolClient | pg.Pool;

type SessionRow = {
  id: string;
  date: string;
  position: number;
  title: string;
  discipline: SessionDTO['discipline'];
  purpose: SessionDTO['purpose'];
  focus: string[];
  equipment: string[];
  descriptor: string | null;
  duration_seconds: number | null;
  distance_metres: number | null;
  pace_seconds_per_km: number | null;
  load: number | null;
  estimated: boolean;
  chart_seconds: number | null;
  tick_every_minutes: number | null;
  completed_at: Date | null;
  completion_activity_id: string | null;
  coach_name: string | null;
  coach_note: string | null;
  segments: SegmentDTO[] | null;
};

/** Only the keys that were actually set: the DTO's targets are all optional. */
function toTargets(row: SessionRow): SessionDTO['targets'] {
  return {
    ...(row.duration_seconds !== null ? { durationSeconds: row.duration_seconds } : {}),
    ...(row.distance_metres !== null ? { distanceMetres: row.distance_metres } : {}),
    ...(row.pace_seconds_per_km !== null ? { paceSecondsPerKm: row.pace_seconds_per_km } : {}),
    ...(row.load !== null ? { load: row.load } : {}),
    ...(row.estimated ? { estimated: true } : {}),
  };
}

function toSessionDTO(row: SessionRow): SessionDTO {
  return {
    id: row.id,
    date: row.date,
    order: row.position,
    title: row.title,
    discipline: row.discipline,
    purpose: row.purpose,
    focus: row.focus,
    equipment: row.equipment,
    descriptor: row.descriptor,
    targets: toTargets(row),
    segments: row.segments ?? [],
    chartSeconds: row.chart_seconds,
    tickEveryMinutes: row.tick_every_minutes,
    /*
     * Not stored yet. The detail sheet's step tree, chart bands, intensity and
     * export targets were modelled on the client first; there are no columns
     * behind them, so the API serves a session with no written-out workout
     * rather than pretending to one. A migration adding them is what turns
     * these from empty into real, and until then only the `mock` environment
     * shows the step list.
     */
    bands: [],
    sets: [],
    intensity: null,
    estimateBasis: null,
    connections: [],
    completion: row.completed_at
      ? {
          completedAt: row.completed_at.toISOString(),
          activityId: row.completion_activity_id,
        }
      : null,
    coachName: row.coach_name,
    coachNote: row.coach_note,
  };
}

/**
 * Sessions between two days, inclusive, ordered by day then position.
 *
 * `date between` over the `(user_id, date, position)` index, so the window is a
 * range scan and the ordering is free.
 */
export async function findWindow(
  userId: string,
  from: string,
  to: string,
  db: Queryable,
): Promise<SessionDTO[]> {
  const { rows } = await db.query<SessionRow>(
    `select s.id, s.date, s.position, s.title, s.discipline, s.purpose,
            s.focus, s.equipment, s.descriptor,
            s.duration_seconds, s.distance_metres, s.pace_seconds_per_km,
            s.load, s.estimated, s.chart_seconds, s.tick_every_minutes,
            s.completed_at, s.completion_activity_id, s.coach_name, s.coach_note,
            (select json_agg(json_build_object(
                      'startSeconds', g.start_seconds,
                      'durationSeconds', g.duration_seconds,
                      'intensity', g.intensity,
                      'zone', g.zone,
                      'drill', g.drill)
                    order by g.position)
               from session_segments g where g.session_id = s.id) as segments
       from sessions s
      where s.user_id = $1 and s.date between $2 and $3
      order by s.date, s.position`,
    [userId, from, to],
  );

  return rows.map(toSessionDTO);
}

export async function findOne(
  userId: string,
  sessionId: string,
  db: Queryable,
): Promise<SessionDTO | null> {
  const { rows } = await db.query<{ date: string }>(
    'select date from sessions where id = $1 and user_id = $2',
    [sessionId, userId],
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  const [session] = await findWindow(userId, row.date, row.date, db);
  return session ?? null;
}

/**
 * Sets or clears a session's completion.
 *
 * `user_id` is in the predicate rather than checked beforehand: the update
 * simply matches nothing for someone else's session, so there is no window
 * between a check and a write.
 */
export async function setCompletion(
  userId: string,
  sessionId: string,
  activityId: string | null,
  completed: boolean,
  db: Queryable,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `update sessions
        set completed_at = case when $3 then now() else null end,
            completion_activity_id = case when $3 then $4::uuid else null end
      where id = $1 and user_id = $2`,
    [sessionId, userId, completed, activityId],
  );

  return (rowCount ?? 0) > 0;
}
