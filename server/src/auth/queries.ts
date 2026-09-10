/**
 * The SQL the auth feature runs.
 *
 * Kept apart from the logic in `service.ts` so the queries can be read as
 * queries — and so that when one needs an index, it is obvious which.
 */
import type pg from 'pg';

import type { AuthProvider } from '../domain.ts';
import { pool } from '../db.ts';

export type UserRow = {
  id: string;
  email: string;
  email_verified: boolean;
  timezone: string;
};

export type IdentityRow = {
  id: string;
  user_id: string;
  provider: AuthProvider;
  subject: string;
  password_hash: string | null;
};

export type RefreshRow = {
  id: string;
  user_id: string;
  family_id: string;
  expires_at: Date;
  consumed_at: Date | null;
  revoked_at: Date | null;
};

type Queryable = pg.PoolClient | pg.Pool;

/** Matches the `lower(email)` unique index, so it uses it rather than scanning. */
export async function findUserByEmail(
  email: string,
  db: Queryable = pool,
): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(
    `select id, email, email_verified, timezone
       from users where lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findIdentity(
  provider: AuthProvider,
  subject: string,
  db: Queryable = pool,
): Promise<IdentityRow | null> {
  const { rows } = await db.query<IdentityRow>(
    `select id, user_id, provider, subject, password_hash
       from identities where provider = $1 and subject = $2`,
    [provider, subject],
  );
  return rows[0] ?? null;
}

export async function insertUser(
  email: string,
  timezone: string,
  emailVerified: boolean,
  db: Queryable,
): Promise<UserRow> {
  const { rows } = await db.query<UserRow>(
    `insert into users (email, timezone, email_verified)
     values ($1, $2, $3)
     returning id, email, email_verified, timezone`,
    [email, timezone, emailVerified],
  );
  return rows[0]!;
}

export async function insertIdentity(
  userId: string,
  provider: AuthProvider,
  subject: string,
  passwordHash: string | null,
  db: Queryable,
): Promise<void> {
  await db.query(
    `insert into identities (user_id, provider, subject, password_hash)
     values ($1, $2, $3, $4)`,
    [userId, provider, subject, passwordHash],
  );
}

/** The providers attached to an account, in a stable order. */
export async function findProviders(
  userId: string,
  db: Queryable = pool,
): Promise<AuthProvider[]> {
  const { rows } = await db.query<{ provider: AuthProvider }>(
    'select provider from identities where user_id = $1 order by provider',
    [userId],
  );
  return rows.map(row => row.provider);
}

export async function findUserById(
  userId: string,
  db: Queryable = pool,
): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(
    'select id, email, email_verified, timezone from users where id = $1',
    [userId],
  );
  return rows[0] ?? null;
}

export async function insertRefreshToken(
  userId: string,
  hash: string,
  familyId: string,
  expiresAt: Date,
  db: Queryable,
): Promise<void> {
  await db.query(
    `insert into refresh_tokens (user_id, token_hash, family_id, expires_at)
     values ($1, $2, $3, $4)`,
    [userId, hash, familyId, expiresAt],
  );
}

/**
 * Locks the row for the length of the transaction.
 *
 * `for update` matters here: two refreshes arriving together would otherwise
 * both read an unconsumed token and both succeed, which is exactly the replay
 * the family exists to detect.
 */
export async function lockRefreshToken(
  hash: string,
  db: pg.PoolClient,
): Promise<RefreshRow | null> {
  const { rows } = await db.query<RefreshRow>(
    `select id, user_id, family_id, expires_at, consumed_at, revoked_at
       from refresh_tokens where token_hash = $1 for update`,
    [hash],
  );
  return rows[0] ?? null;
}

export async function consumeRefreshToken(id: string, db: pg.PoolClient): Promise<void> {
  await db.query('update refresh_tokens set consumed_at = now() where id = $1', [id]);
}

/** Ends every session descended from one sign-in. */
export async function revokeFamily(familyId: string, db: Queryable): Promise<void> {
  await db.query(
    'update refresh_tokens set revoked_at = now() where family_id = $1 and revoked_at is null',
    [familyId],
  );
}
