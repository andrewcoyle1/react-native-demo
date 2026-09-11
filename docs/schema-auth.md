# Auth schema

The first migration. Design notes and the SQL, ahead of `server/migrations/`.

The app has never been deployed, so there is no data to preserve and no backfill
to plan. Everything below can change freely until the first real athlete exists.

## Tables

### `users` — the account

```sql
create table users (
  id             uuid primary key default gen_random_uuid(),
  email          text        not null,
  email_verified boolean     not null default false,
  timezone       text        not null default 'UTC',
  created_at     timestamptz not null default now(),
  modified_at    timestamptz not null default now()
);

-- Case-insensitive uniqueness without the citext extension. A functional index
-- also means lookups must use the same expression: where lower(email) = lower($1).
create unique index users_email_lower_idx on users (lower(email));
```

Every account has an email, including those created through Apple or Google —
Apple's "hide my email" returns a real, deliverable relay address
(`…@privaterelay.appleid.com`), so `not null` holds.

`timezone` sits here rather than on the profile because it is needed before a
profile exists: anything the server decides about *days* needs it, and a
signed-in athlete may have no profile yet.

### `identities` — how the account signs in

One account, up to three ways in.

```sql
create table identities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references users(id) on delete cascade,
  provider      text        not null check (provider in ('email', 'apple', 'google')),
  -- Apple and Google: the provider's stable subject claim. Email: lower(email).
  subject       text        not null,
  -- Only ever set for provider = 'email'.
  password_hash text,
  created_at    timestamptz not null default now(),

  constraint identities_password_matches_provider
    check ((provider = 'email') = (password_hash is not null))
);

-- No two accounts may claim the same provider identity.
create unique index identities_provider_subject_idx on identities (provider, subject);
-- One identity per provider per account.
create unique index identities_user_provider_idx on identities (user_id, provider);
```

`password_hash` lives here rather than on `users` because it belongs to one way
of signing in, not to the account. An account with only an Apple identity has no
password at all, and the check constraint makes that structural rather than a
convention someone has to remember.

**Apple returns the email and full name only on the first authorization.** Every
sign-in after that carries the subject and nothing else. If they are not
persisted the first time they are gone permanently — there is no endpoint to ask
for them again. The name arrives from the *client SDK*, not from the identity
token, so the client has to forward it on that first exchange.

### `profiles` — the athlete

```sql
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
```

Separate from `users`, and 1:1 by primary key rather than a surrogate id. The
reason is a state the app already models: `UserState.absent` — signed in, no
profile yet. As its own table that is simply "no row", which is exactly what a
`404` on `GET /v1/profile` means. Folded into `users` it would become "name is
null", which is the same thing said worse and defeats `not null`.

`text` plus `check` rather than a Postgres `enum`, throughout. The domain
already keeps the runtime arrays (`DISCIPLINES`, `ZONES`, `PURPOSES`), and
altering a native enum is far more painful than editing a constraint.

### `refresh_tokens` — rotation and reuse detection

```sql
create table refresh_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references users(id) on delete cascade,
  token_hash  text        not null,
  family_id   uuid        not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  consumed_at timestamptz,
  revoked_at  timestamptz
);

create unique index refresh_tokens_hash_idx on refresh_tokens (token_hash);
create index refresh_tokens_family_idx on refresh_tokens (family_id);
create index refresh_tokens_user_idx on refresh_tokens (user_id);
```

Three decisions worth defending:

**`token_hash`, never the token.** A refresh token is a bearer credential: whoever
holds it can mint access tokens. Storing it in plaintext means a database leak
is an account takeover for every user at once. SHA-256 is sufficient here —
unlike a password, the token is already high-entropy and random, so it needs no
slow hash.

**`family_id` is what makes rotation safe.** Each sign-in starts a family. Every
refresh consumes one row (`consumed_at`) and issues the next in the same family.
If a token that is already consumed is presented again, one of two things has
happened: a legitimate client retried, or a stolen token is being replayed.
There is no way to tell them apart, so the safe response is to revoke the whole
family and force a sign-in.

```sql
update refresh_tokens set revoked_at = now()
where family_id = $1 and revoked_at is null;
```

**Rows are kept, not deleted.** Consumed and revoked tokens stay so reuse can be
detected at all — a deleted row is indistinguishable from one that never
existed. They need a sweeper eventually:

```sql
delete from refresh_tokens where expires_at < now() - interval '30 days';
```

## Linking, and the account takeover it invites

`users_email_lower_idx` makes email unique, so when a Google sign-in arrives
bearing an email that already exists, the server must either link the two or
refuse. Linking on email alone is a known takeover:

1. An attacker signs up with `victim@example.com` and a password. They cannot
   read the verification mail, so the address stays unverified — but the account
   exists.
2. The victim later signs in with Google, which asserts the same address.
3. Auto-linking hands the victim's account, and everything they subsequently
   record, to the attacker's password.

The rule that closes it:

```
find identity by (provider, subject)
  found      -> sign in. Nothing else to check.
  not found  -> find user by lower(email)
      none            -> create user + identity; email_verified = provider's claim
      exists, and BOTH the provider asserts the email is verified
                  AND the existing user's email is already verified
                      -> attach the new identity to that user
      otherwise       -> refuse with `link_requires_verification`
```

The refusal is not a dead end: the athlete signs in the way they originally did,
and links the second provider from an authenticated session, where identity is
already proven and no email comparison is needed.

## Token lifetimes

| | Value | Why |
|---|---|---|
| Access token | 15 min | Short enough that revocation is nearly immediate without a database read per request |
| Refresh token | 30 days | Long enough that a regular user never signs in twice |
| Reuse grace | none | Any replay revokes the family. See the single-flight rule in `docs/api.md` |

The access token is a JWT so it can be verified without touching Postgres. It
carries `sub` (the user id), `iat`, `exp` and nothing else — no email, no
profile. Anything that can change must be read, not trusted from a token minted
fifteen minutes ago.

## Migration mechanism

Plain numbered SQL files, applied in order, with a table recording what has run:

```sql
create table schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now()
);
```

A runner of about forty lines: list `migrations/*.sql`, compare against the
table, apply the missing ones **each in its own transaction**, insert the
version. Postgres has transactional DDL, so a failed migration leaves nothing
half-applied — which is precisely the property that makes a hand-rolled runner
defensible here.

Chosen over `node-pg-migrate` or Drizzle Kit deliberately: the goal is to learn
Postgres, and a tool whose behaviour you must learn instead of SQL's works
against that. It is the wrong choice for a team deploying concurrently, because
it takes no advisory lock — worth revisiting if that ever becomes true.

## What this does not cover

- **Email delivery.** Verification and password reset both need it. Until it
  exists, a password sign-up must record `email_verified = false`. **It must not
  be stubbed `true`** — doing so re-opens the takeover the linking rule above
  exists to close: an attacker registers the victim's address, the stub marks it
  verified, and the victim's Google sign-in is then auto-linked into the
  attacker's account.

  `false` is safe and costs little. It means a password account never
  auto-links, so an athlete who signs up by email and later wants Apple must
  attach it from an authenticated session — which is the safe path anyway.
  Accounts created through Apple or Google take the provider's claim and are
  verified from the start.
- **Rate limiting.** `sign-in`, `sign-up` and `refresh` need it per IP and per
  account. It is server middleware, not schema, but it is not optional.
- **Sessions listing / "sign out everywhere".** The `refresh_tokens` table can
  already support both; no endpoint is specified yet.
