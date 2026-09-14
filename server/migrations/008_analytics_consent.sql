-- ─── analytics consent ───────────────────────────────────────────────────────
--
-- On `users`, not `profiles`. Consent is asked at the top of onboarding, before
-- a profile row exists, so a column on `profiles` could not hold the answer at
-- the moment it is given.
--
-- Null is a real state and the default: it means the athlete has not been
-- asked, which is deliberately distinct from 'denied'. Only null raises the
-- prompt, and under GDPR silence is not consent.
--
-- `analytics_consent_at` exists because Article 7(1) puts the burden on us to
-- demonstrate that consent was given. A value with no timestamp is an assertion;
-- a value with one is a record.

alter table users
  add column analytics_consent    text,
  add column analytics_consent_at timestamptz;

alter table users
  add constraint users_analytics_consent_valid
    check (analytics_consent is null or analytics_consent in ('granted', 'denied'));

-- The answer and the time it was given travel together or not at all.
alter table users
  add constraint users_analytics_consent_timed
    check ((analytics_consent is null) = (analytics_consent_at is null));
