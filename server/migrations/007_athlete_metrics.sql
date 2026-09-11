-- Body metrics and threshold fitness figures, collected once during
-- onboarding and used to seed training zones.
--
-- One row per athlete, keyed by them, on the same "there is exactly one"
-- shape as `schedules` — these are today's numbers, not a history of them, so
-- there is nothing to page through and no reason for a child table.

create table athlete_metrics (
  user_id                 uuid primary key references users(id) on delete cascade,
  height_cm               smallint check (height_cm is null or height_cm between 50 and 250),
  weight_kg               real     check (weight_kg is null or weight_kg between 20 and 300),
  heart_rate_min          smallint check (heart_rate_min is null or heart_rate_min between 20 and 250),
  heart_rate_max          smallint check (heart_rate_max is null or heart_rate_max between 20 and 250),
  cycling_ftp             smallint check (cycling_ftp is null or cycling_ftp between 20 and 700),
  run_pace_seconds_per_km real     check (run_pace_seconds_per_km is null or run_pace_seconds_per_km > 0),
  swim_pace_seconds_per_100m real  check (swim_pace_seconds_per_100m is null or swim_pace_seconds_per_100m > 0),
  modified_at             timestamptz not null default now(),

  constraint athlete_metrics_hr_ordered
    check (heart_rate_min is null or heart_rate_max is null or heart_rate_max >= heart_rate_min)
);

create trigger athlete_metrics_touch before update on athlete_metrics
  for each row execute function touch_modified_at();
