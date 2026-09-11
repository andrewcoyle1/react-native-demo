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

import type { UserDTO } from '../domain.ts';

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

/** Lives on `users`, so it is set separately from the rest of the profile. */
export async function updateTimezone(
  userId: string,
  timezone: string,
  db: Queryable,
): Promise<void> {
  await db.query('update users set timezone = $2 where id = $1', [userId, timezone]);
}
