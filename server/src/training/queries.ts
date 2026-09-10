/**
 * The SQL behind plans, races and the schedule.
 *
 * Two shapes recur here and are worth naming. Legs and commitments are child
 * rows aggregated into their parent with `json_agg`, so one round trip returns
 * a whole document rather than N+1 queries. `weekly_planned_hours` is a
 * Postgres array and comes back as one, needing no aggregation at all.
 */
import type pg from 'pg';

import type { CommitmentDTO, PlanDTO, RaceDTO, RaceLegDTO, ScheduleDTO } from '../domain.ts';

type Queryable = pg.PoolClient | pg.Pool;

type PlanRow = {
  id: string;
  name: string;
  status: PlanDTO['status'];
  phase: string | null;
  start_date: string;
  end_date: string;
  weeks: number;
  weekly_planned_hours: number[];
  current_week_index: number | null;
  current_week_progress: number | null;
  race_id: string | null;
  artwork_url: string | null;
};

type RaceRow = {
  id: string;
  name: string;
  place: string;
  date: string;
  priority: RaceDTO['priority'];
  target_seconds: number | null;
  artwork_url: string | null;
  legs: RaceLegDTO[] | null;
};

type ScheduleRow = {
  available_minutes: number[];
  modified_at: Date;
  commitments: CommitmentDTO[] | null;
};

export async function findPlans(
  userId: string,
  statuses: PlanDTO['status'][],
  db: Queryable,
): Promise<PlanDTO[]> {
  const { rows } = await db.query<PlanRow>(
    `select id, name, status, phase, start_date, end_date, weeks,
            weekly_planned_hours, current_week_index, current_week_progress,
            race_id, artwork_url
       from plans
      where user_id = $1 and status = any($2)
      order by start_date`,
    [userId, statuses],
  );

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    status: row.status,
    phase: row.phase,
    startDate: row.start_date,
    endDate: row.end_date,
    weeks: row.weeks,
    weeklyPlannedHours: row.weekly_planned_hours,
    currentWeekIndex: row.current_week_index,
    currentWeekProgress: row.current_week_progress,
    raceId: row.race_id,
    artworkUrl: row.artwork_url,
  }));
}

export async function findRaces(userId: string, db: Queryable): Promise<RaceDTO[]> {
  const { rows } = await db.query<RaceRow>(
    `select r.id, r.name, r.place, r.date, r.priority, r.target_seconds, r.artwork_url,
            (select json_agg(json_build_object(
                      'discipline', l.discipline,
                      'distanceMetres', l.distance_metres)
                    order by l.position)
               from race_legs l where l.race_id = r.id) as legs
       from races r
      where r.user_id = $1
      order by r.date`,
    [userId],
  );

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    place: row.place,
    date: row.date,
    priority: row.priority,
    // `json_agg` over no rows is null, not an empty array.
    legs: row.legs ?? [],
    targetSeconds: row.target_seconds,
    artworkUrl: row.artwork_url,
  }));
}

export async function findSchedule(
  userId: string,
  db: Queryable,
): Promise<ScheduleDTO | null> {
  const { rows } = await db.query<ScheduleRow>(
    `select s.available_minutes, s.modified_at,
            (select json_agg(json_build_object(
                      'id', c.id, 'label', c.label,
                      'weekday', c.weekday, 'discipline', c.discipline)
                    order by c.weekday, c.label)
               from commitments c where c.user_id = s.user_id) as commitments
       from schedules s
      where s.user_id = $1`,
    [userId],
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    availableMinutes: row.available_minutes,
    commitments: row.commitments ?? [],
    modifiedAt: row.modified_at.toISOString(),
  };
}

export async function upsertAvailability(
  userId: string,
  availableMinutes: number[],
  db: Queryable,
): Promise<void> {
  await db.query(
    `insert into schedules (user_id, available_minutes) values ($1, $2)
     on conflict (user_id) do update
       set available_minutes = excluded.available_minutes,
           modified_at = now()`,
    [userId, availableMinutes],
  );
}

/**
 * Replaces the commitment set wholesale.
 *
 * The client sends the list it wants to exist, not a diff, so delete-then-insert
 * inside the caller's transaction is both simpler and exactly right: there is no
 * identity to preserve across the change.
 */
export async function replaceCommitments(
  userId: string,
  commitments: Omit<CommitmentDTO, 'id'>[],
  db: pg.PoolClient,
): Promise<void> {
  await db.query('delete from commitments where user_id = $1', [userId]);

  for (const commitment of commitments) {
    await db.query(
      `insert into commitments (user_id, label, weekday, discipline)
       values ($1, $2, $3, $4)`,
      [userId, commitment.label.trim(), commitment.weekday, commitment.discipline],
    );
  }
}

/** True when the athlete has a schedule row at all. */
export async function hasSchedule(userId: string, db: Queryable): Promise<boolean> {
  const { rows } = await db.query('select 1 from schedules where user_id = $1', [userId]);
  return rows.length > 0;
}
