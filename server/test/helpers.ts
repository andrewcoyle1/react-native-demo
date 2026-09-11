/**
 * Shared test plumbing.
 *
 * Every test starts from an empty database rather than trying to clean up after
 * itself, because a test that fails part-way leaves debris otherwise and the
 * next failure is then someone else's.
 */
import { buildApp } from '../src/app.ts';
import { pool } from '../src/db.ts';

/**
 * The app as most tests use it, with the rate limits raised out of the way.
 *
 * Every `inject()` call arrives from the same address, so the real limits would
 * be reached within one describe block — and these tests are about what the
 * endpoints do, not about how often they may be called. `rate-limit.test.ts`
 * builds its own app with tight limits and asserts the limiter separately.
 */
export function buildTestApp() {
  return buildApp({ rateLimit: { max: 100_000, authMax: 100_000 } });
}

/** Empties every table. `cascade` follows the foreign keys for us. */
export async function resetDatabase(): Promise<void> {
  await pool.query('truncate users, refresh_tokens restart identity cascade');
}

/** Inserts an account and returns its id. */
export async function createUser(
  email: string,
  options: { verified?: boolean } = {},
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    'insert into users (email, email_verified) values ($1, $2) returning id',
    [email, options.verified ?? false],
  );
  return rows[0]!.id;
}

/** Asserts that `work` violates a named database constraint. */
export async function expectViolation(
  work: () => Promise<unknown>,
  constraint: string,
): Promise<void> {
  try {
    await work();
  } catch (error) {
    const message = (error as Error).message;
    if (!message.includes(constraint)) {
      throw new Error(`Expected a violation of "${constraint}", got: ${message}`);
    }
    return;
  }
  throw new Error(`Expected a violation of "${constraint}", but the write succeeded.`);
}
