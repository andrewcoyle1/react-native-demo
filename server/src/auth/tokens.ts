/**
 * Access and refresh tokens.
 *
 * They are deliberately different kinds of thing. The access token is a signed
 * JWT so it can be verified without touching Postgres, which is what makes it
 * cheap enough to check on every request. The refresh token is opaque and
 * random, stored only as a hash, because it is a bearer credential whose
 * database row must be revocable.
 */
import { createHash, randomBytes } from 'node:crypto';

import { SignJWT, jwtVerify } from 'jose';

import { config } from '../config.ts';

/** Short, so revocation is nearly immediate without a read per request. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Long, so a regular user never signs in twice. */
export const REFRESH_TOKEN_TTL_DAYS = 30;

const key = new TextEncoder().encode(config.jwtSecret);

export type AccessToken = { token: string; expiresAt: Date };

/**
 * Carries the user id and nothing else. Anything that can change — email,
 * verification, profile — must be read, not trusted from a token minted up to
 * fifteen minutes ago.
 */
export async function createAccessToken(userId: string): Promise<AccessToken> {
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(key);

  return { token, expiresAt };
}

/** The user id, or null for anything that fails verification for any reason. */
export async function readAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export type RefreshToken = { token: string; hash: string; expiresAt: Date };

/**
 * 32 random bytes. Stored as a SHA-256 hash so a database leak yields nothing
 * usable — and a fast hash suffices here precisely because the token is already
 * high-entropy, unlike a password.
 */
export function createRefreshToken(): RefreshToken {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    hash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
  };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
