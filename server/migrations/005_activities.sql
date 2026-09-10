-- What the athlete actually did.
--
-- The counterpart to a session: a session is planned and lives in a bounded
-- window, an activity is recorded and accumulates for as long as they train.
-- That difference is why this is the one collection the app pages through.

create table activities (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references users(id) on delete cascade,
  -- The planned session this satisfied, once something has matched them. The
  -- activity outlives the plan being regenerated.
  session_id         uuid        references sessions(id) on delete set null,

  -- An instant, unlike a session's date: an activity happened at a moment.
  started_at         timestamptz not null,
  title              text        not null check (length(title) between 1 and 200),
  discipline         text        not null check (discipline in ('swim', 'run', 'ride', 'weights')),
  place              text,

  /*
   * A normalised 0-1 polyline, drawn as a thumbnail and never queried. jsonb
   * rather than a child table for exactly that reason: unlike session segments,
   * no question is ever asked of an individual point.
   */
  route              jsonb       not null default '[]',
  -- How it reached the app: linked, uploaded, effort.
  sources            text[]      not null default '{}',

  -- Recorded figures, flattened so Trends can sum them.
  distance_metres    integer     check (distance_metres is null or distance_metres >= 0),
  duration_seconds   integer     check (duration_seconds is null or duration_seconds >= 0),
  pace_seconds_per_km real       check (pace_seconds_per_km is null or pace_seconds_per_km > 0),
  average_heart_rate smallint    check (average_heart_rate is null or average_heart_rate between 20 and 260),
  calories           integer     check (calories is null or calories >= 0),

  created_at         timestamptz not null default now()
);

/*
 * Serves both reads, and the ordering matters.
 *
 * Paging is keyset — `(started_at, id) < (cursor)` — rather than OFFSET, which
 * skips or repeats rows as data changes underneath a walk. The id is in the key
 * because two activities can share an instant (a bulk import from a watch),
 * and a cursor on the timestamp alone would then drop one of them.
 */
create index activities_user_started_idx on activities (user_id, started_at desc, id desc);
