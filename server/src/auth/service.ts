/**
 * What signing in actually means.
 *
 * The HTTP shape is in `routes.ts`; the SQL is in `queries.ts`. This file holds
 * the rules — including the two that are security boundaries rather than
 * conveniences: an unknown email must be indistinguishable from a wrong
 * password, and a replayed refresh token must end every session descended from
 * the same sign-in.
 */
import { randomUUID } from 'node:crypto';

import type { AuthUserDTO, SessionResponse } from '../domain.ts';
import { transaction } from '../db.ts';
import { conflict, unauthorized } from '../errors.ts';
import { hashPassword, verifyNothing, verifyPassword } from './password.ts';
import * as q from './queries.ts';
import { createAccessToken, createRefreshToken, hashRefreshToken } from './tokens.ts';

/** The email identity's subject is the address, lowercased. */
const subjectFor = (email: string) => email.trim().toLowerCase();

/**
 * `db` is threaded through rather than defaulted to the pool: during sign-up the
 * identity has been inserted but not committed, and a different connection
 * cannot see it — which showed up as an account with no providers.
 */
async function toAuthUser(user: q.UserRow, db?: Db): Promise<AuthUserDTO> {
  return {
    uid: user.id,
    email: user.email,
    emailVerified: user.email_verified,
    providers: await q.findProviders(user.id, db),
  };
}

/** Issues a fresh pair, starting a new family unless continuing one. */
type Db = Parameters<typeof q.insertRefreshToken>[4];

async function issueSession(
  user: q.UserRow,
  familyId: string,
  db: Db,
): Promise<SessionResponse> {
  const access = await createAccessToken(user.id);
  const refresh = createRefreshToken();

  await q.insertRefreshToken(user.id, refresh.hash, familyId, refresh.expiresAt, db);

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    expiresAt: access.expiresAt.toISOString(),
    user: await toAuthUser(user, db),
  };
}

export async function signUp(input: {
  email: string;
  password: string;
  timezone: string;
}): Promise<SessionResponse> {
  const email = input.email.trim();

  return transaction(async db => {
    if (await q.findUserByEmail(email, db)) {
      throw conflict('email_taken', 'That email is already registered.');
    }

    /*
     * `email_verified` is false, and must stay false until an email is actually
     * delivered and clicked. Marking a fresh sign-up verified would re-open the
     * linking takeover in docs/schema-auth.md: an attacker registers the
     * victim's address, and the victim's Google sign-in is then merged into it.
     */
    const user = await q.insertUser(email, input.timezone, false, db);
    await q.insertIdentity(user.id, 'email', subjectFor(email), await hashPassword(input.password), db);

    return issueSession(user, randomUUID(), db);
  });
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<SessionResponse> {
  const identity = await q.findIdentity('email', subjectFor(input.email));

  /*
   * A missing account still costs a full argon2 verification. Returning early
   * would make "no such user" measurably faster than "wrong password", which
   * turns the endpoint into a way to enumerate who has an account.
   */
  if (!identity?.password_hash) {
    await verifyNothing(input.password);
    throw unauthorized('invalid_credentials', 'Email or password is incorrect.');
  }

  if (!(await verifyPassword(identity.password_hash, input.password))) {
    throw unauthorized('invalid_credentials', 'Email or password is incorrect.');
  }

  const user = await q.findUserById(identity.user_id);
  if (!user) {
    throw unauthorized('invalid_credentials', 'Email or password is incorrect.');
  }

  return transaction(db => issueSession(user, randomUUID(), db));
}

/**
 * Rotates a refresh token.
 *
 * The row is locked for the length of the transaction, so two refreshes racing
 * cannot both find it unconsumed. Presenting a token that was already consumed
 * is treated as theft — a legitimate retry and a stolen token look identical
 * from here, so the whole family is revoked and the athlete signs in again.
 */
type RefreshOutcome =
  | { kind: 'ok'; session: SessionResponse }
  | { kind: 'invalid' }
  | { kind: 'reused' }
  | { kind: 'revoked' }
  | { kind: 'expired' };

export async function refresh(token: string): Promise<SessionResponse> {
  const hash = hashRefreshToken(token);

  /*
   * The transaction returns an outcome instead of throwing, and the error is
   * raised afterwards.
   *
   * This is not stylistic. Revoking the family and then throwing from inside the
   * transaction rolls the revocation back — the theft is reported and nothing is
   * actually revoked, which is worse than not detecting it, because it looks
   * handled. The revocation has to commit; only then does the request fail.
   */
  const outcome = await transaction<RefreshOutcome>(async db => {
    const row = await q.lockRefreshToken(hash, db);

    if (!row) {
      return { kind: 'invalid' };
    }

    if (row.consumed_at) {
      await q.revokeFamily(row.family_id, db);
      return { kind: 'reused' };
    }

    if (row.revoked_at) {
      return { kind: 'revoked' };
    }

    if (row.expires_at.getTime() <= Date.now()) {
      return { kind: 'expired' };
    }

    const user = await q.findUserById(row.user_id, db);
    if (!user) {
      return { kind: 'invalid' };
    }

    await q.consumeRefreshToken(row.id, db);

    // Same family: a continuation of one sign-in, not a new one.
    return { kind: 'ok', session: await issueSession(user, row.family_id, db) };
  });

  switch (outcome.kind) {
    case 'ok':
      return outcome.session;
    case 'reused':
      throw unauthorized('token_reused', 'That refresh token has already been used.');
    case 'revoked':
      throw unauthorized('token_revoked', 'That session has been ended.');
    case 'expired':
      throw unauthorized('token_expired', 'That refresh token has expired.');
    default:
      throw unauthorized('token_invalid', 'That refresh token is not recognised.');
  }
}

/**
 * Ends the session the token belongs to, and every token descended from it.
 *
 * Deliberately silent about an unrecognised token: signing out is not a place
 * to tell a caller whether a credential was real.
 */
export async function signOut(token: string): Promise<void> {
  const hash = hashRefreshToken(token);

  await transaction(async db => {
    const row = await q.lockRefreshToken(hash, db);
    if (row) {
      await q.revokeFamily(row.family_id, db);
    }
  });
}

/** The signed-in account, for `GET /v1/auth/me`. */
export async function currentUser(userId: string): Promise<AuthUserDTO | null> {
  const user = await q.findUserById(userId);
  return user ? toAuthUser(user) : null;
}
