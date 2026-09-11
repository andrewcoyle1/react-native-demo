-- Training load, and the fitness metrics derived from it.
--
-- Sessions already carry a planned load. This adds the recorded one, without
-- which "fitness" and "fatigue" have nothing to be computed from: they are
-- exponentially weighted averages of what the athlete actually did, not of
-- what the plan asked for.

alter table activities
  -- 0-10 on the same scale as a session's planned load, so the two compare.
  add column load real check (load is null or load between 0 and 10);

/*
 * A partial index over the days that carry load.
 *
 * The fitness series walks a long window — a hundred days or more, since the
 * chronic average needs that much history to be meaningful — and most rows in
 * it contribute nothing. Indexing only the ones that do keeps that walk small.
 */
create index activities_user_load_idx on activities (user_id, started_at)
  where load is not null;
