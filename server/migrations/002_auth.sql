-- Accounts, the ways they sign in, the athlete behind them, and sessions.
--
-- Design and reasoning: docs/schema-auth.md

-- ─── users: the account ──────────────────────────────────────────────────────

create table users (
  id             uuid primary key default gen_random_uuid(),
  email          text        not null,
  email_verified boolean     not null default false,
  -- IANA zone. The server cannot decide what calendar day it is for this
  -- athlete without it, and it is needed before a profile exists.
  timezone       text        not null default 'UTC',
  created_at     timestamptz not null default now(),
  modified_at    timestamptz not null default now(),

  constraint users_email_shaped check (position('@' in email) > 1)
);

-- Case-insensitive uniqueness without the citext extension. Lookups must use
-- the same expression to hit it: where lower(email) = lower($1).
create unique index users_email_lower_idx on users (lower(email));

create trigger users_touch before update on users
  for each row execute function touch_modified_at();

-- ─── identities: how the account signs in ────────────────────────────────────

create table identities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references users(id) on delete cascade,
  provider      text        not null check (provider in ('email', 'apple', 'google')),
  -- Apple and Google: the provider's stable subject claim.
  -- Email: lower(email), so the pair below is the credential's identity.
  subject       text        not null,
  password_hash text,
  created_at    timestamptz not null default now(),

  -- A password belongs to one way of signing in, not to the account. An
  -- Apple-only account has none, and this makes that structural.
  constraint identities_password_matches_provider
    check ((provider = 'email') = (password_hash is not null))
);

-- No two accounts may claim the same provider identity. This is what makes
-- "find the account for this Apple subject" a single unambiguous lookup.
create unique index identities_provider_subject_idx on identities (provider, subject);

-- One identity per provider per account: an account cannot hold two Google
-- logins, so linking is always an insert or a conflict, never a merge.
create unique index identities_user_provider_idx on identities (user_id, provider);

-- ─── profiles: the athlete ───────────────────────────────────────────────────

-- Separate from users, keyed by the same id. A row's absence is exactly the
-- app's `UserState.absent`: signed in, profile not yet created.
create table profiles (
  user_id       uuid primary key references users(id) on delete cascade,
  name          text        not null check (length(name) between 1 and 100),
  date_of_birth date        not null,
  sex           text        not null check (sex in ('male', 'female', 'other')),
  units         text        not null default 'metric'
                            check (units in ('metric', 'imperial')),
  created_at    timestamptz not null default now(),
  modified_at   timestamptz not null default now()
);

create trigger profiles_touch before update on profiles
  for each row execute function touch_modified_at();

-- ─── refresh_tokens: rotation with reuse detection ───────────────────────────

create table refresh_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references users(id) on delete cascade,
  -- A hash, never the token. A refresh token is a bearer credential, so a
  -- database leak would otherwise be an account takeover for every user at
  -- once. SHA-256 suffices: unlike a password, the token is already random.
  token_hash  text        not null,
  -- Each sign-in starts a family; each rotation stays within it. Replaying a
  -- consumed token revokes the whole family, because a legitimate retry and a
  -- stolen token are indistinguishable.
  family_id   uuid        not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  -- Set when rotated. Rows are kept rather than deleted: a deleted row cannot
  -- be told apart from one that never existed, which is what reuse detection
  -- needs to distinguish.
  consumed_at timestamptz,
  revoked_at  timestamptz
);

create unique index refresh_tokens_hash_idx on refresh_tokens (token_hash);
create index refresh_tokens_family_idx on refresh_tokens (family_id);
create index refresh_tokens_user_idx on refresh_tokens (user_id);
