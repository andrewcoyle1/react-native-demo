-- Shared building blocks every later migration leans on.
--
-- Deliberately not auth: this one exists to prove the runner, the connection
-- and the test harness work before any real schema depends on them.

-- Keeps modified_at honest without every handler remembering to set it, and
-- without trusting a value sent by a client.
create or replace function touch_modified_at() returns trigger as $$
begin
  new.modified_at = now();
  return new;
end;
$$ language plpgsql;
