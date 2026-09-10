/**
 * Password hashing.
 *
 * argon2id: memory-hard, so a leaked hash costs an attacker RAM as well as
 * time, which is what blunts GPU cracking. The library's defaults already
 * exceed OWASP's floor, so they are left alone rather than tuned by guesswork.
 */
import argon2 from 'argon2';

/**
 * Long enough to matter, capped so that hashing cannot be used as a denial of
 * service — argon2 will happily chew through a megabyte of "password".
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 256;

/**
 * A hash of a value nobody knows, used to spend the same time verifying a
 * password for an account that does not exist as for one that does. Without it
 * response timing tells an attacker which emails are registered.
 */
let decoyHash: Promise<string> | null = null;

function decoy(): Promise<string> {
  decoyHash ??= argon2.hash('decoy value, never a real password', { type: argon2.argon2id });
  return decoyHash;
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // A malformed stored hash is a verification failure, not a crash.
    return false;
  }
}

/** Burns the same work as a real verification, and always fails. */
export async function verifyNothing(password: string): Promise<false> {
  await argon2.verify(await decoy(), password).catch(() => false);
  return false;
}
