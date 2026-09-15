/**
 * The SQL behind `POST /v1/onboarding/complete`.
 *
 * Profile and metrics are both upserts: unlike `profile/queries.ts`'s
 * `insertProfile`, which rejects a second call, onboarding may be resubmitted
 * (a network retry, a user who backs up and changes an answer) and must not
 * fail the second time.
 */
import type pg from 'pg';

import { toMetricsDTO, type MetricsRow } from '../profile/queries.ts';

import type { AthleteMetricsDTO, PlanDTO, UserDTO } from '../domain.ts';

type Queryable = pg.PoolClient | pg.Pool;



export async function upsertProfile(
  userId: string,
  draft: { name: string; dateOfBirth: string; sex: UserDTO['sex']; units: UserDTO['units'] },
  db: Queryable,
): Promise<void> {
  await db.query(
    `insert into profiles (user_id, name, date_of_birth, sex, units)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id) do update
       set name = excluded.name,
           date_of_birth = excluded.date_of_birth,
           sex = excluded.sex,
           units = excluded.units,
           modified_at = now()`,
    [userId, draft.name.trim(), draft.dateOfBirth, draft.sex, draft.units],
  );
}

export async function updateTimezone(userId: string, timezone: string, db: Queryable): Promise<void> {
  await db.query('update users set timezone = $2 where id = $1', [userId, timezone]);
}

export async function upsertMetrics(
  userId: string,
  metrics: {
    heightCm?: number;
    weightKg?: number;
    heartRateMin?: number;
    heartRateMax?: number;
    cyclingFtp?: number;
    runPaceSecondsPerKm?: number;
    swimPaceSecondsPer100m?: number;
  },
  db: Queryable,
): Promise<AthleteMetricsDTO> {
  const { rows } = await db.query<MetricsRow>(
    `insert into athlete_metrics
       (user_id, height_cm, weight_kg, heart_rate_min, heart_rate_max, cycling_ftp,
        run_pace_seconds_per_km, swim_pace_seconds_per_100m)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (user_id) do update
       set height_cm = excluded.height_cm,
           weight_kg = excluded.weight_kg,
           heart_rate_min = excluded.heart_rate_min,
           heart_rate_max = excluded.heart_rate_max,
           cycling_ftp = excluded.cycling_ftp,
           run_pace_seconds_per_km = excluded.run_pace_seconds_per_km,
           swim_pace_seconds_per_100m = excluded.swim_pace_seconds_per_100m,
           modified_at = now()
     returning height_cm, weight_kg, heart_rate_min, heart_rate_max, cycling_ftp,
               run_pace_seconds_per_km, swim_pace_seconds_per_100m, modified_at`,
    [
      userId,
      metrics.heightCm ?? null,
      metrics.weightKg ?? null,
      metrics.heartRateMin ?? null,
      metrics.heartRateMax ?? null,
      metrics.cyclingFtp ?? null,
      metrics.runPaceSecondsPerKm ?? null,
      metrics.swimPaceSecondsPer100m ?? null,
    ],
  );
  return toMetricsDTO(rows[0]!);
}

export async function insertRace(
  userId: string,
  race: {
    name: string;
    place: string;
    date: string;
    priority: 'A' | 'B' | 'C';
    targetSeconds: number | null;
    legs: { discipline: string; distanceMetres: number }[];
  },
  db: pg.PoolClient,
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into races (user_id, name, place, date, priority, target_seconds)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [userId, race.name.trim(), race.place.trim(), race.date, race.priority, race.targetSeconds],
  );
  const raceId = rows[0]!.id;

  for (const [position, leg] of race.legs.entries()) {
    await db.query(
      `insert into race_legs (race_id, position, discipline, distance_metres)
       values ($1, $2, $3, $4)`,
      [raceId, position, leg.discipline, leg.distanceMetres],
    );
  }

  return raceId;
}

export async function insertPlan(
  userId: string,
  plan: {
    raceId: string | null;
    name: string;
    phase: string | null;
    startDate: string;
    endDate: string;
    weeks: number;
    weeklyPlannedHours: number[];
    artworkUrl: string | null;
    /** Defaults to the plan the athlete starts on. */
    status?: PlanDTO['status'];
  },
  db: pg.PoolClient,
): Promise<string> {
  const status = plan.status ?? 'current';
  /*
   * A queued plan has not reached its first week yet, and the column says so:
   * `current_week_index` is documented as null before a plan is under way.
   * Writing 0 would make an upcoming plan claim to be in its opening week.
   */
  const weekIndex = status === 'upcoming' ? null : 0;

  const { rows } = await db.query<{ id: string }>(
    `insert into plans (user_id, race_id, name, status, phase, start_date, end_date,
                        weeks, weekly_planned_hours, current_week_index, current_week_progress,
                        artwork_url)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning id`,
    [
      userId, plan.raceId, plan.name, status, plan.phase, plan.startDate, plan.endDate,
      plan.weeks, plan.weeklyPlannedHours, weekIndex, weekIndex === null ? null : 0,
      plan.artworkUrl,
    ],
  );
  return rows[0]!.id;
}

export async function insertSession(
  userId: string,
  planId: string,
  session: {
    date: string;
    position: number;
    title: string;
    discipline: string;
    purpose: string | null;
    durationSeconds: number;
  },
  db: pg.PoolClient,
): Promise<void> {
  await db.query(
    `insert into sessions (user_id, plan_id, date, position, title, discipline, purpose,
                           duration_seconds, estimated)
     values ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
    [
      userId, planId, session.date, session.position, session.title,
      session.discipline, session.purpose, session.durationSeconds,
    ],
  );
}
