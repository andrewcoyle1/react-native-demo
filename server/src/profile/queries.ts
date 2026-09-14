/**
 * The SQL behind `/v1/profile`.
 *
 * A profile spans two tables. `timezone` lives on `users` because the server
 * needs it before a profile exists — anything that decides what *day* it is for
 * this athlete depends on it — while the rest is the athlete's own detail. The
 * API presents them as one document, and that seam is stitched here rather than
 * leaking into the client.
 */
import type pg from 'pg';

import type { AthleteMetricsDTO, UserDTO } from '../domain.ts';

type Queryable = pg.PoolClient | pg.Pool;

export type ProfileRow = {
  id: string;
  name: string;
  date_of_birth: string;
  sex: UserDTO['sex'];
  units: UserDTO['units'];
  timezone: string;
  created_at: Date;
  modified_at: Date;
};

export function toUserDTO(row: ProfileRow): UserDTO {
  return {
    id: row.id,
    name: row.name,
    // Already a 'YYYY-MM-DD' string: the date type parser in db.ts keeps the
    // driver from converting it into the server's zone.
    dateOfBirth: row.date_of_birth,
    sex: row.sex,
    timezone: row.timezone,
    units: row.units,
    createdAt: row.created_at.toISOString(),
    modifiedAt: row.modified_at.toISOString(),
  };
}

export async function findProfile(
  userId: string,
  db: Queryable,
): Promise<ProfileRow | null> {
  const { rows } = await db.query<ProfileRow>(
    `select u.id, p.name, p.date_of_birth, p.sex, p.units, u.timezone,
            p.created_at, p.modified_at
       from profiles p
       join users u on u.id = p.user_id
      where p.user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function insertProfile(
  userId: string,
  draft: { name: string; dateOfBirth: string; sex: string; units: string },
  db: Queryable,
): Promise<void> {
  await db.query(
    `insert into profiles (user_id, name, date_of_birth, sex, units)
     values ($1, $2, $3, $4, $5)`,
    [userId, draft.name.trim(), draft.dateOfBirth, draft.sex, draft.units],
  );
}

/**
 * Applies whichever fields were supplied.
 *
 * `coalesce` with a null placeholder rather than a query built by string
 * concatenation: one statement, one plan, and no chance of assembling SQL from
 * caller-controlled keys.
 */
export async function updateProfile(
  userId: string,
  changes: { name?: string; dateOfBirth?: string; sex?: string; units?: string },
  db: Queryable,
): Promise<void> {
  await db.query(
    `update profiles set
       name          = coalesce($2, name),
       date_of_birth = coalesce($3::date, date_of_birth),
       sex           = coalesce($4, sex),
       units         = coalesce($5, units)
     where user_id = $1`,
    [
      userId,
      changes.name?.trim() ?? null,
      changes.dateOfBirth ?? null,
      changes.sex ?? null,
      changes.units ?? null,
    ],
  );
}

/**
 * Records an analytics consent decision.
 *
 * On `users` rather than `profiles` because this is answered at the top of
 * onboarding, before a profile row exists. The timestamp is written in the same
 * statement as the answer: Article 7(1) asks us to demonstrate that consent was
 * given, and an answer with no time attached demonstrates very little.
 */
export async function updateAnalyticsConsent(
  userId: string,
  consent: 'granted' | 'denied',
  db: Queryable,
): Promise<{ analyticsConsent: string; analyticsConsentAt: string }> {
  const { rows } = await db.query<{ analytics_consent: string; analytics_consent_at: Date }>(
    `update users
        set analytics_consent = $2,
            analytics_consent_at = now()
      where id = $1
      returning analytics_consent, analytics_consent_at`,
    [userId, consent],
  );
  const row = rows[0]!;
  return {
    analyticsConsent: row.analytics_consent,
    analyticsConsentAt: row.analytics_consent_at.toISOString(),
  };
}

/** Lives on `users`, so it is set separately from the rest of the profile. */
export async function updateTimezone(
  userId: string,
  timezone: string,
  db: Queryable,
): Promise<void> {
  await db.query('update users set timezone = $2 where id = $1', [userId, timezone]);
}

/*
 * Athlete metrics.
 *
 * `athlete_metrics` is one row per athlete, written first by onboarding and
 * edited afterwards from the profile screen. The mapping lives here rather than
 * in `onboarding/` because this module is where the figures are read and
 * changed over the account's life; onboarding only seeds them once.
 */

export type MetricsRow = {
  height_cm: number | null;
  weight_kg: number | null;
  heart_rate_min: number | null;
  heart_rate_max: number | null;
  cycling_ftp: number | null;
  run_pace_seconds_per_km: number | null;
  swim_pace_seconds_per_100m: number | null;
  modified_at: Date;
};

const METRICS_COLUMNS = `height_cm, weight_kg, heart_rate_min, heart_rate_max, cycling_ftp,
                         run_pace_seconds_per_km, swim_pace_seconds_per_100m, modified_at`;

export function toMetricsDTO(row: MetricsRow): AthleteMetricsDTO {
  return {
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    heartRateMin: row.heart_rate_min,
    heartRateMax: row.heart_rate_max,
    cyclingFtp: row.cycling_ftp,
    runPaceSecondsPerKm: row.run_pace_seconds_per_km,
    swimPaceSecondsPer100m: row.swim_pace_seconds_per_100m,
    modifiedAt: row.modified_at.toISOString(),
  };
}

export async function findMetrics(userId: string, db: Queryable): Promise<MetricsRow | null> {
  const { rows } = await db.query<MetricsRow>(
    `select ${METRICS_COLUMNS} from athlete_metrics where user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * Applies whichever figures were supplied, leaving the rest as they are.
 *
 * Deliberately not the same statement as onboarding's `upsertMetrics`: that one
 * writes a whole set at once, so an absent key means null. Here an absent key
 * means "unchanged", which is what a PATCH of a single figure needs — editing
 * FTP must not blank the heart-rate range sitting beside it.
 *
 * `null` is therefore ambiguous on the wire and the route resolves it: a field
 * the caller omits is not in `changes` at all, while a field explicitly set to
 * null arrives as `null` and clears the column. That is what the Clear button
 * on the pace pickers needs.
 */
export async function patchMetrics(
  userId: string,
  changes: Partial<Record<keyof AthleteMetricsDTO, number | null>>,
  db: Queryable,
): Promise<MetricsRow> {
  const has = (key: keyof AthleteMetricsDTO) => Object.hasOwn(changes, key);

  const { rows } = await db.query<MetricsRow>(
    `insert into athlete_metrics
       (user_id, height_cm, weight_kg, heart_rate_min, heart_rate_max, cycling_ftp,
        run_pace_seconds_per_km, swim_pace_seconds_per_100m)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (user_id) do update
       set height_cm                  = case when $9  then excluded.height_cm                  else athlete_metrics.height_cm end,
           weight_kg                  = case when $10 then excluded.weight_kg                  else athlete_metrics.weight_kg end,
           heart_rate_min             = case when $11 then excluded.heart_rate_min             else athlete_metrics.heart_rate_min end,
           heart_rate_max             = case when $12 then excluded.heart_rate_max             else athlete_metrics.heart_rate_max end,
           cycling_ftp                = case when $13 then excluded.cycling_ftp                else athlete_metrics.cycling_ftp end,
           run_pace_seconds_per_km    = case when $14 then excluded.run_pace_seconds_per_km    else athlete_metrics.run_pace_seconds_per_km end,
           swim_pace_seconds_per_100m = case when $15 then excluded.swim_pace_seconds_per_100m else athlete_metrics.swim_pace_seconds_per_100m end,
           modified_at = now()
     returning ${METRICS_COLUMNS}`,
    [
      userId,
      changes.heightCm ?? null,
      changes.weightKg ?? null,
      changes.heartRateMin ?? null,
      changes.heartRateMax ?? null,
      changes.cyclingFtp ?? null,
      changes.runPaceSecondsPerKm ?? null,
      changes.swimPaceSecondsPer100m ?? null,
      has('heightCm'),
      has('weightKg'),
      has('heartRateMin'),
      has('heartRateMax'),
      has('cyclingFtp'),
      has('runPaceSecondsPerKm'),
      has('swimPaceSecondsPer100m'),
    ],
  );
  return rows[0]!;
}
