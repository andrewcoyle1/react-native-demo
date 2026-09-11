-- A second database for `npm test`.
--
-- The suite truncates every table before each test. Pointed at the
-- development database that would silently destroy real data in the middle
-- of an unrelated change, so the two are kept apart at the connection string.
create database stamina_test owner stamina;
