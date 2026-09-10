/**
 * What the auth schema actually enforces.
 *
 * These are not tests of Postgres. Each one pins a rule from
 * `docs/schema-auth.md` that the application would otherwise have to remember —
 * and the reason for writing them is that the linking policy is a security
 * boundary, and a security boundary defended only by careful reading is not
 * defended.
 */
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';

import { pool } from '../src/db.ts';
import { migrate } from '../src/migrate.ts';
import { createUser, expectViolation, resetDatabase } from './helpers.ts';

await migrate();

after(async () => {
  await pool.end();
});

beforeEach(resetDatabase);

describe('users', () => {
  it('treats email as case-insensitively unique', async () => {
    await createUser('athlete@example.com');

    await expectViolation(
      () => createUser('ATHLETE@example.com'),
      'users_email_lower_idx',
    );
  });

  it('defaults to UTC until the client says otherwise', async () => {
    const id = await createUser('athlete@example.com');
    const { rows } = await pool.query('select timezone, email_verified from users where id = $1', [id]);

    assert.equal(rows[0]!.timezone, 'UTC');
    // A new account is never trusted as verified. Stubbing this true would
    // re-open the linking takeover; see docs/schema-auth.md.
    assert.equal(rows[0]!.email_verified, false);
  });

  it('touches modified_at on update without being asked', async () => {
    const id = await createUser('athlete@example.com');
    const before = await pool.query('select modified_at from users where id = $1', [id]);

    await pool.query("update users set timezone = 'Europe/Dublin' where id = $1", [id]);
    const after_ = await pool.query('select modified_at from users where id = $1', [id]);

    assert.ok(
      after_.rows[0]!.modified_at > before.rows[0]!.modified_at,
      'modified_at should advance',
    );
  });
});

describe('identities', () => {
  it('requires a password for email and forbids one for oauth', async () => {
    const id = await createUser('athlete@example.com');

    await expectViolation(
      () =>
        pool.query(
          "insert into identities (user_id, provider, subject) values ($1, 'email', 'athlete@example.com')",
          [id],
        ),
      'identities_password_matches_provider',
    );

    await expectViolation(
      () =>
        pool.query(
          "insert into identities (user_id, provider, subject, password_hash) values ($1, 'apple', 'sub-1', 'hash')",
          [id],
        ),
      'identities_password_matches_provider',
    );
  });

  it('lets one account hold email, apple and google at once', async () => {
    const id = await createUser('athlete@example.com');

    await pool.query(
      `insert into identities (user_id, provider, subject, password_hash) values
         ($1, 'email',  'athlete@example.com', 'hash'),
         ($1, 'apple',  'apple-sub-1',  null),
         ($1, 'google', 'google-sub-1', null)`,
      [id],
    );

    const { rows } = await pool.query(
      'select provider from identities where user_id = $1 order by provider',
      [id],
    );
    assert.deepEqual(rows.map(r => r.provider), ['apple', 'email', 'google']);
  });

  it('refuses a second identity for the same provider on one account', async () => {
    const id = await createUser('athlete@example.com');
    await pool.query(
      "insert into identities (user_id, provider, subject) values ($1, 'apple', 'apple-sub-1')",
      [id],
    );

    await expectViolation(
      () =>
        pool.query(
          "insert into identities (user_id, provider, subject) values ($1, 'apple', 'apple-sub-2')",
          [id],
        ),
      'identities_user_provider_idx',
    );
  });

  it('refuses to let two accounts claim the same provider subject', async () => {
    const first = await createUser('first@example.com');
    const second = await createUser('second@example.com');

    await pool.query(
      "insert into identities (user_id, provider, subject) values ($1, 'google', 'shared-sub')",
      [first],
    );

    await expectViolation(
      () =>
        pool.query(
          "insert into identities (user_id, provider, subject) values ($1, 'google', 'shared-sub')",
          [second],
        ),
      'identities_provider_subject_idx',
    );
  });

  it('disappears with the account it belongs to', async () => {
    const id = await createUser('athlete@example.com');
    await pool.query(
      "insert into identities (user_id, provider, subject) values ($1, 'apple', 'apple-sub-1')",
      [id],
    );

    await pool.query('delete from users where id = $1', [id]);

    const { rows } = await pool.query('select 1 from identities');
    assert.equal(rows.length, 0, 'identities should cascade');
  });
});

describe('profiles', () => {
  it('is absent until created, which is a state and not an error', async () => {
    const id = await createUser('athlete@example.com');
    const { rows } = await pool.query('select 1 from profiles where user_id = $1', [id]);

    assert.equal(rows.length, 0);
  });

  it('rejects a sex outside the domain union', async () => {
    const id = await createUser('athlete@example.com');

    await expectViolation(
      () =>
        pool.query(
          "insert into profiles (user_id, name, date_of_birth, sex) values ($1, 'Sam', '1990-05-14', 'unknown')",
          [id],
        ),
      'profiles_sex_check',
    );
  });

  it('returns date_of_birth as a plain YYYY-MM-DD string', async () => {
    const id = await createUser('athlete@example.com');
    await pool.query(
      "insert into profiles (user_id, name, date_of_birth, sex) values ($1, 'Sam', '1990-05-14', 'other')",
      [id],
    );

    const { rows } = await pool.query('select date_of_birth from profiles where user_id = $1', [id]);

    // Not a Date object: the driver's default parser would shift the calendar
    // day into the server's zone. See the type parser in src/db.ts.
    assert.equal(rows[0]!.date_of_birth, '1990-05-14');
  });
});

describe('refresh tokens', () => {
  it('refuses two rows with the same token hash', async () => {
    const id = await createUser('athlete@example.com');
    const insert = () =>
      pool.query(
        `insert into refresh_tokens (user_id, token_hash, family_id, expires_at)
         values ($1, 'hash-1', gen_random_uuid(), now() + interval '30 days')`,
        [id],
      );

    await insert();
    await expectViolation(insert, 'refresh_tokens_hash_idx');
  });

  it('keeps consumed rows so a replay can be detected', async () => {
    const id = await createUser('athlete@example.com');
    const family = (await pool.query<{ id: string }>('select gen_random_uuid() as id')).rows[0]!.id;

    await pool.query(
      `insert into refresh_tokens (user_id, token_hash, family_id, expires_at, consumed_at)
       values ($1, 'hash-1', $2, now() + interval '30 days', now())`,
      [id, family],
    );

    const { rows } = await pool.query(
      'select consumed_at from refresh_tokens where token_hash = $1',
      ['hash-1'],
    );
    assert.ok(rows[0]!.consumed_at, 'the row survives rotation, carrying its timestamp');
  });

  it('revokes a whole family at once', async () => {
    const id = await createUser('athlete@example.com');
    const family = (await pool.query<{ id: string }>('select gen_random_uuid() as id')).rows[0]!.id;

    await pool.query(
      `insert into refresh_tokens (user_id, token_hash, family_id, expires_at) values
         ($1, 'hash-1', $2, now() + interval '30 days'),
         ($1, 'hash-2', $2, now() + interval '30 days')`,
      [id, family],
    );

    await pool.query(
      'update refresh_tokens set revoked_at = now() where family_id = $1 and revoked_at is null',
      [family],
    );

    const { rows } = await pool.query(
      'select count(*)::int as live from refresh_tokens where family_id = $1 and revoked_at is null',
      [family],
    );
    assert.equal(rows[0]!.live, 0);
  });
});
