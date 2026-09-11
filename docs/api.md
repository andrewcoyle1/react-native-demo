# Stamina API contract

The agreement between the Expo app in `src/` and the Node service in `server/`.
Both are TypeScript; both read this file.

## How this document is kept honest

A prose contract drifts. It is one of two layers, and it is the weaker one:

| Layer | Lives in | Covers | Enforced by |
|---|---|---|---|
| Wire schemas | `src/domain/wire.ts` (written) | Field names, types, nullability | The compiler, on both sides |
| This document | `docs/api.md` | Status codes, error meaning, auth lifecycle, ordering, authorization | Review |

**If the two disagree, the schemas win and this file is wrong.** Fix it here
rather than working around it.

The schemas are shared by path, not by package: `src/domain/` imports nothing
(`training.ts` has no imports at all), so `server/tsconfig.json` aliases
`@/domain/*` to `../src/domain/*` and both sides compile against one definition.
If the service ever moves to its own repository this breaks, and the contract
has to be republished as a package or generated from OpenAPI instead.

### Wire types are not domain types

`ActivityModel.startedAt` is a `Date`. JSON has no dates. Every model therefore
has a wire twin whose timestamps are strings, and a converter between them:

```
ActivityDTO  --(parse, reject on failure)-->  ActivityModel
```

The app already does exactly this for Firestore, in
`src/providers/shared/firestore.ts` — `readString`, `readDate`, `readEnum`, and
the rule that a malformed document converts to `null` and is dropped rather than
producing a model with an invented date. The API client keeps that rule.
`src/providers/shared/wire.ts` will be the same guards over JSON, or a Zod
`safeParse`, which has the same reject-don't-fabricate behaviour.

---

## Conventions

| | |
|---|---|
| Base URL | `/v1` — the version is in the path, and only changes for a break |
| Content type | `application/json; charset=utf-8` |
| Casing | `camelCase` on the wire. Postgres columns are `snake_case`; the server maps at its edge, so the wire never leaks column names |
| Timestamps | ISO 8601 with offset, always UTC: `2026-09-10T13:57:00.000Z` |
| Calendar days | `YYYY-MM-DD`, never a timestamp. See below |
| IDs | UUID v4 as a string |
| Unknown fields | Servers strip them from requests; clients ignore them in responses. This is what lets a field be added without a version bump |
| Auth | `Authorization: Bearer <access token>` on everything except `/v1/auth/*` |
| Change cursor | Every read returns `X-Change-Cursor`, the change-log position its data reflects. Open the stream with it as `Last-Event-ID` and no change is applied twice or missed |

### Why days are strings

A session belongs to a date in the athlete's own timezone. If Tuesday's long run
is stored as an instant, a flight moves it to Monday. `date` is therefore a
`YYYY-MM-DD` string end to end — `DateKey` in the domain, `date` in Postgres —
and is never converted to or from UTC. Activities are different: an activity
happened at an instant, so `startedAt` is a real timestamp.

---

## Errors

Every non-2xx response carries the same envelope:

```json
{ "error": { "code": "session_not_found", "message": "No session with that id.", "details": {} } }
```

`message` is for developers and logs. It is never shown to an athlete — the app
renders its own copy from `code`.

| HTTP | `code` examples | What the client does |
|---|---|---|
| 400 | `invalid_request` | Bug. Report through `reportError`, show the generic failure |
| 401 | `token_expired`, `token_invalid` | Refresh once, retry once. See the token lifecycle |
| 403 | `forbidden` | `RemoteState.error`. Never retried |
| 404 | `not_found` | For a single document: treat as absent, not an error |
| 409 | `email_taken`, `link_requires_verification`, `stale_write` | Surfaced to the athlete as a specific message |
| 422 | `validation_failed` | `details` carries per-field messages |
| 429 | `rate_limited` | Honour `Retry-After` |
| 5xx | `internal` | `RemoteState.error`. Safe to retry a read, never a write |

Note the 404 row: `UserState` already distinguishes `absent` from `error`, and a
missing profile is a legitimate state, not a failure.

---

## Auth and the token lifecycle

The app's `AuthService` is five methods, so the surface is small. The lifecycle
around it is where the difficulty is.

| Endpoint | Body | Returns |
|---|---|---|
| `POST /v1/auth/sign-up` | `SignUpRequest` | `SessionResponse` |
| `POST /v1/auth/sign-in` | `SignInRequest` | `SessionResponse` |
| `POST /v1/auth/oauth` | `OAuthRequest` | `SessionResponse` — signs in or creates, by provider subject |
| `POST /v1/auth/link` | `LinkRequest`, authenticated | `AuthUserDTO` — attaches another provider to the current account |
| `POST /v1/auth/refresh` | `{ refreshToken }` | `TokenPair` |
| `POST /v1/auth/sign-out` | `{ refreshToken }` | 204 |
| `GET /v1/auth/me` | — | `AuthUserDTO` |
| `DELETE /v1/auth/me` | — authenticated | 204 — deletes the account and everything descended from it |

```ts
type TokenPair = {
  accessToken: string;       // JWT, ~15 minutes
  refreshToken: string;      // opaque, ~30 days, rotated on every use
  expiresAt: string;         // ISO, when accessToken dies
};

type AuthUserDTO = {
  uid: string;
  email: string;
  emailVerified: boolean;
  providers: ('email' | 'apple' | 'google')[];
};
```

Sign-in with Apple and Google exchange a provider ID token for our own token
pair at `POST /v1/auth/oauth`. The provider's token is verified server-side
against its JWKS — signature, issuer, audience and the nonce the client
generated — and then discarded. Everything after that is our own session, so the
lifecycle below is unchanged whichever way the athlete signed in.

Two provider-specific traps, both permanent if missed:

- **Apple sends the full name once**, on the first authorization only, to the
  client SDK rather than in the token. `OAuthRequest.fullName` carries it. There
  is no way to ask again.
- **Matching on email alone is an account takeover.** The rule, and the attack
  it prevents, are in `docs/schema-auth.md`. In short: attach a new provider to
  an existing account only when both the provider and the existing account agree
  the email is verified; otherwise return `link_requires_verification` and make
  the athlete sign in the original way first.

### Rules the client must follow

1. **Refresh is single-flight.** On launch this app opens five or more reads at
   once — the profile, notes, three training subscriptions, and a session
   window. If the access token has expired they all 401 together. Without a
   shared in-flight refresh promise that is five concurrent refresh calls, and
   because refresh tokens rotate, four of them present a consumed token and
   fail. The athlete is logged out on every cold start. One refresh, everything
   else queues behind it, then all retry once.
2. **The refresh token lives in `expo-secure-store`**, never `AsyncStorage`.
3. **One retry, then give up.** A second 401 after a successful refresh is a real
   authorization failure, not a stale token.

### Rules the server must follow

1. Rotate the refresh token on every use, and treat presentation of an already
   consumed token as theft: revoke the whole family and force a sign-in.
2. Hash with argon2id.
3. Rate-limit `sign-in`, `sign-up` and `refresh` by IP and by account.
4. Verify the provider's nonce on every OAuth exchange, or the flow is
   replayable.

Email delivery for verification and password reset is the server's problem now.
Until it exists, `emailVerified` may be stubbed `true`; the field stays in the
contract so the app does not have to change when it becomes real.

**`DELETE /v1/auth/me` is unrecoverable.** Every table references `users(id) on
delete cascade`, so one statement removes the identity, every refresh token,
the profile, races, plans, sessions and activities — there is no grace period
or soft delete at this layer. The client is where confirmation belongs (a
typed-confirmation dialog, not just an "are you sure?"), since by the time the
request reaches here the athlete has already agreed.

---

## Pagination

Only activities page. Everything else is bounded by a date window.

```
GET /v1/activities?cursor=<opaque>&limit=20
```

```json
{ "items": [ /* ActivityDTO */ ], "cursor": "1786601520000" }
```

- `cursor` is **opaque**. The client passes back what it was given and parses
  nothing. It currently encodes `startedAt` in epoch milliseconds; that is the
  server's business and may change without a version bump.
- `cursor: null` in a response means there are no further pages.
- Omitting `cursor` in a request asks for the first page.
- `limit` defaults to 20, maximum 100.
- Ordering is `startedAt` descending, and is stable: an activity added while
  paging appears on a later refresh, never duplicated mid-walk.

This is keyset pagination — `WHERE started_at < $1 ORDER BY started_at DESC
LIMIT $2` — not `OFFSET`, which would skip or repeat rows as data changes.

---

## Resources

Every endpoint is scoped to the caller. There is no `userId` in any path: the
uid comes from the token, and a request can only ever reach its own data.

### Profile

| | |
|---|---|
| `GET /v1/profile` | `UserDTO`, or **404** when the athlete has not completed setup — which the app renders as `absent`, not an error |
| `POST /v1/profile` | Creates it. `ProfileDraft`. 409 if one exists |
| `PATCH /v1/profile` | Partial. Any field of `ProfileDraft` |

```ts
type UserDTO = {
  id: string;
  name: string;
  dateOfBirth: string;        // YYYY-MM-DD
  sex: 'male' | 'female' | 'other';
  timezone: string;           // IANA, 'Europe/Dublin'
  units: 'metric' | 'imperial';
  createdAt: string | null;   // ISO
  modifiedAt: string | null;  // ISO
};
```

`timezone` lets the server decide what day it is for this athlete — required by
anything that generates a plan, marks a session missed, or schedules a reminder.
It is stored on the account rather than the profile, because a signed-in athlete
may not have a profile yet; the profile read surfaces it for convenience.

`units` replaces the hardcoded `'metric'` that every presenter call site passes
today. `formatDistance` and `formatSpeed` already take it as a parameter, so the
whole app switches to imperial the moment this field is honoured.

### Sessions

| | |
|---|---|
| `GET /v1/sessions?from=YYYY-MM-DD&to=YYYY-MM-DD` | Both bounds inclusive and **required**. Ordered by `date`, then `order` |
| `PATCH /v1/sessions/:id/completion` | `{ completion: CompletionDTO \| null }`. Null un-completes |

The window is required rather than defaulted: an athlete accumulates sessions
for as long as they train, and an unbounded read of this collection is always a
mistake. The server rejects a span wider than 400 days with `422`.

```ts
type SessionDTO = {
  id: string;
  date: string;               // YYYY-MM-DD
  order: number;              // position within the day
  title: string;
  discipline: 'swim' | 'run' | 'ride' | 'weights';
  purpose: 'recovery' | 'endurance' | 'speed' | 'commitment' | null;
  focus: string[];            // 'Body position', 'Kicking'
  equipment: string[];        // 'Snorkel', 'Board'
  descriptor: string | null;  // 'Long run'
  targets: {
    durationSeconds?: number;
    distanceMetres?: number;
    paceSecondsPerKm?: number;   // rendered as pace or speed by discipline
    load?: number;               // 0-10
    estimated?: boolean;         // the design's asterisk
  };
  segments: {
    startSeconds: number;
    durationSeconds: number;
    intensity: number;           // 0-1
    zone: 'warmup' | 'easy' | 'hard' | 'swim' | 'ride' | 'sprint' | 'drill';
    drill: boolean;
  }[];
  chartSeconds: number | null;      // axis length, not the same as duration
  tickEveryMinutes: number | null;
  completion: CompletionDTO | null;
  coachName: string | null;
  coachNote: string | null;
};

type CompletionDTO = {
  completedAt: string;              // ISO. Server-assigned; a client value is ignored
  activityId: string | null;
};
```

Note `chartSeconds` is deliberately separate from `targets.durationSeconds`: the
chart's axis must not shrink to the last effort when a session ends with a long
cool-down.

### Plans

`GET /v1/plans?status=current,upcoming` — read-only. Ordered by `startDate`.
Defaults to `current,upcoming`; completed plans are never returned unless asked
for, because no screen shows one.

`DELETE /v1/plans` — 204. The one exception to "read-only": deletes every plan
the athlete has, of any status, and with them every session those plans
generated (`sessions.plan_id` cascades). Races and recorded activities are
untouched — a reset clears what was *planned*, not the athlete's goal events or
what they actually did. This is what the profile screen's "Reset Training
Plans" calls; the client is responsible for the athlete then reaching setup
again to generate a new one.

```ts
type PlanDTO = {
  id: string;
  name: string;                     // 'Prep Plan'
  status: 'current' | 'upcoming' | 'complete';
  phase: string | null;             // 'Base Phase'
  startDate: string;                // YYYY-MM-DD
  endDate: string;
  weeks: number;
  weeklyPlannedHours: number[];     // one per week; denormalised for the card's chart
  currentWeekIndex: number | null;  // 0-based
  currentWeekProgress: number | null;
  raceId: string | null;
  artworkUrl: string | null;
};
```

`weeklyPlannedHours` is denormalised on purpose: it lets the dashboard card cost
one row instead of aggregating a year of sessions the client has no other reason
to fetch.

### Races

`GET /v1/races` — read-only. Ordered by `date` ascending.

```ts
type RaceDTO = {
  id: string;
  name: string;
  place: string;
  date: string;                     // YYYY-MM-DD
  priority: 'A' | 'B' | 'C';
  legs: { discipline: Discipline; distanceMetres: number }[];  // in race order
  targetSeconds: number | null;
  artworkUrl: string | null;
};
```

### Schedule

| | |
|---|---|
| `GET /v1/schedule` | `ScheduleDTO`, or **404** when never set |
| `PUT /v1/schedule` | Upsert. The first write creates it |

```ts
type ScheduleDTO = {
  availableMinutes: number[];       // exactly 7, index 0 = Sunday
  commitments: {
    id: string;
    label: string;
    weekday: number;                // 0-6, 0 = Sunday, matching Date.getDay
    discipline: Discipline | null;
  }[];
  modifiedAt: string | null;
};
```

`availableMinutes` must be exactly seven entries. A shorter array is `422`, not
padded — a weekday index must never run off the end of it.

### Activities

| | |
|---|---|
| `GET /v1/activities?cursor=&limit=` | Paged history, newest first |
| `GET /v1/activities?from=&to=` | A date window, for the Plan tab's week |

The two forms are exclusive; sending both is `400`. The windowed form exists
because the Plan tab sets one week of recorded work against one week of planned
work, and paging backwards to reach an old week would be both slow and wrong.

```ts
type ActivityDTO = {
  id: string;
  startedAt: string;                // ISO instant, not a date key
  title: string;
  discipline: Discipline;
  place: string | null;
  route: { x: number; y: number }[];   // normalised 0-1, a polyline for drawing
  sources: ('linked' | 'uploaded' | 'effort')[];
  stats: {
    distanceMetres?: number;
    durationSeconds?: number;
    paceSecondsPerKm?: number;
    averageHeartRate?: number;
    calories?: number;
  };
  sessionId: string | null;         // set when matched to a planned session
};
```

---

## Authorization

Carried over from `firebase/firestore.rules`, which this replaces. The rules
were untestable; this table is middleware, and can have tests.

| Resource | Read | Write |
|---|---|---|
| Profile | Owner | Owner, fields `name`, `dateOfBirth`, `sex` only |
| Plans | Owner | **Server only.** Generated by the backend |
| Races | Owner | **Server only** |
| Sessions | Owner | Owner, **`completion` only**. No create, no delete |
| Activities | Owner | **Server only**, from device sync |
| Schedule | Owner | Owner, fields `availableMinutes`, `commitments` only |

Two invariants worth stating explicitly, because they are easy to lose in a
handler that accepts a whole body:

1. **`completedAt` is server-assigned.** A client value is ignored, so a wrong
   phone clock cannot backdate a session.
2. **`createdAt` is immutable** and `modifiedAt` is always `now()` at the server.

---

## Reads stay live

Changes are pushed over an SSE stream, so the app keeps the behaviour Firestore
gave it — including a write's echo, which is what makes a completed session's
tick appear without the provider refetching.

The protocol, the durable change log behind it and the resume rules are in
**`docs/streaming.md`**. Two points belong here because they shape every
endpoint above:

1. **The REST endpoints are the source of initial state.** The stream carries
   changes only. A subscriber fetches a snapshot, reads `X-Change-Cursor` from
   the response, and attaches the stream there. Nothing in this document is
   replaced by streaming.

   A response header rather than a wrapper around every body, so the API client
   captures it once for every request instead of six services each unwrapping an
   envelope — and paged responses, which already have a `cursor` of their own
   meaning something else entirely, stay unambiguous.
2. **The stream is a single connection per device**, carrying every resource and
   demultiplexed on the client. Not one per provider.

If the stream cannot connect, refetching on focus remains correct — just less
immediate. `useRemoteSubscription` needs no change either way: its
`subscribe(key, onData, onError)` signature was always stream-shaped, and
`onData` may fire many times.

---

## Open questions

- Who writes activities? Today they are seeded; in production they arrive from
  Garmin, Strava or Apple Health. That is a sync endpoint and a webhook, and it
  is not specified here yet.
- Session-to-activity matching currently happens on the client, by day and
  discipline. It probably belongs on the server, which would make `sessionId`
  reliable and let the client stop guessing.
- No `ETag` or `If-None-Match` yet. Worth adding for the plan and race reads,
  which change rarely and are fetched on every focus.
- Trends is unbuilt and unspecified. It is the one screen that wants aggregates
  rather than rows — likely `GET /v1/trends?from=&to=` returning computed
  figures, since doing that arithmetic on the client would mean shipping it the
  whole history.
