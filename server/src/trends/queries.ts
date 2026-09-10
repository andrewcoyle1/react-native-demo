/**
 * The SQL behind `/v1/trends`.
 *
 * This is the screen Firestore could not have served. Both halves are
 * aggregates: planned against completed volume, and the exponentially weighted
 * averages that training calls fitness and fatigue. In a document store both
 * mean shipping the whole history to the client and summing it there.
 */
import type pg from 'pg';

type Queryable = pg.PoolClient | pg.Pool;

export type Volume = { durationSeconds: number; distanceMetres: number };

export type LoadPoint = { day: string; fitness: number; fatigue: number };

/**
 * Time constants, in days. These are the standard ones from the training
 * literature: fitness is a slow average and fatigue a fast one, which is why
 * form — their difference — rises during a taper and falls in a hard block.
 */
const FITNESS_DAYS = 42;
const FATIGUE_DAYS = 7;

/**
 * How much history to walk before the reported window.
 *
 * A 42-day average started from zero spends about that long climbing out of a
 * hole of its own making. Warming up over a longer run-in means the first day
 * actually reported is already settled.
 */
export const WARM_UP_DAYS = 120;

/** Planned volume: what the plan asked for across the window. */
export async function findPlanned(
  userId: string,
  from: string,
  to: string,
  db: Queryable,
): Promise<Volume> {
  const { rows } = await db.query<{ duration: string | null; distance: string | null }>(
    `select sum(duration_seconds) as duration, sum(distance_metres) as distance
       from sessions
      where user_id = $1 and date between $2 and $3`,
    [userId, from, to],
  );

  // sum() of bigint-able columns comes back as a string, and null when the
  // window is empty.
  return {
    durationSeconds: Number(rows[0]?.duration ?? 0),
    distanceMetres: Number(rows[0]?.distance ?? 0),
  };
}

/** Completed volume: what was actually recorded in the same window. */
export async function findCompleted(
  userId: string,
  from: string,
  to: string,
  db: Queryable,
): Promise<Volume> {
  const { rows } = await db.query<{ duration: string | null; distance: string | null }>(
    `select sum(duration_seconds) as duration, sum(distance_metres) as distance
       from activities
      where user_id = $1
        and started_at >= ($2::date)::timestamptz
        and started_at <  (($3::date) + 1)::timestamptz`,
    [userId, from, to],
  );

  return {
    durationSeconds: Number(rows[0]?.duration ?? 0),
    distanceMetres: Number(rows[0]?.distance ?? 0),
  };
}

/**
 * The fitness and fatigue series, one row per day up to `to`.
 *
 * Each is an exponentially weighted average of daily load:
 *
 *     today = yesterday + (load - yesterday) / days
 *
 * Which is recursive — every day depends on the one before it — and so is the
 * query. `generate_series` supplies the calendar, including days with nothing
 * recorded, because a rest day is a real input to a decaying average rather
 * than a gap to skip.
 */
export async function findLoadSeries(
  userId: string,
  from: string,
  to: string,
  db: Queryable,
): Promise<LoadPoint[]> {
  const { rows } = await db.query<{ day: string; fitness: number; fatigue: number }>(
    `with recursive calendar as (
       select
         row_number() over (order by day) as n,
         day::date as day,
         coalesce((
           select sum(a.load)
             from activities a
            where a.user_id = $1
              and a.load is not null
              and a.started_at >= day
              and a.started_at < day + interval '1 day'
         ), 0)::real as load
       from generate_series(
              ($2::date - ($4 || ' days')::interval),
              $3::date,
              interval '1 day'
            ) as day
     ),
     series as (
       select n, day, load,
              load / $5::real as fitness,
              load / $6::real as fatigue
         from calendar
        where n = 1

       union all

       select c.n, c.day, c.load,
              s.fitness + (c.load - s.fitness) / $5::real,
              s.fatigue + (c.load - s.fatigue) / $6::real
         from series s
         join calendar c on c.n = s.n + 1
     )
     select day::text as day, fitness, fatigue
       from series
      where day >= $2::date
      order by day`,
    [userId, from, to, WARM_UP_DAYS, FITNESS_DAYS, FATIGUE_DAYS],
  );

  return rows.map(row => ({
    day: row.day,
    fitness: row.fitness,
    fatigue: row.fatigue,
  }));
}
