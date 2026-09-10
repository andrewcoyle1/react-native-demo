/**
 * Seeds an account with a plan, a race and a schedule.
 *
 * The backend is supposed to generate these; nothing does yet, and that is a
 * real open question rather than an oversight. Until it is answered, this puts
 * the fixture the mock services already carry into Postgres, so development
 * against the real API is not strictly worse than development against mocks.
 *
 *   npm run seed -- athlete@stamina.test
 */
import { pool, transaction } from './db.ts';

const ARTWORK = {
  prep: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800',
  race: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800',
};

/** Weekly hours, rising through the block with recovery weeks stepped back. */
const PREP_HOURS = [8, 9, 7, 10, 11, 9, 12, 13, 10, 14, 12, 15, 13, 16, 14, 11, 17, 15, 18, 16, 13, 19, 17, 12];
const RACE_HOURS = [6, 9, 7, 11, 8, 12, 9, 13, 10, 14, 11, 15, 12, 16, 13, 10, 17, 14, 18, 15];

async function seed(email: string): Promise<void> {
  await transaction(async db => {
    const { rows } = await db.query<{ id: string }>(
      'select id from users where lower(email) = lower($1)',
      [email],
    );

    const userId = rows[0]?.id;
    if (!userId) {
      throw new Error(`No account for ${email}. Sign up in the app first.`);
    }

    // Idempotent: running twice replaces rather than duplicates.
    await db.query('delete from plans where user_id = $1', [userId]);
    await db.query('delete from races where user_id = $1', [userId]);
    await db.query('delete from commitments where user_id = $1', [userId]);

    const race = await db.query<{ id: string }>(
      `insert into races (user_id, name, place, date, priority, target_seconds, artwork_url)
       values ($1, 'IRONMAN 70.3 Luxembourg', 'Moselle, Luxembourg 🇱🇺', '2027-07-11', 'A', $2, $3)
       returning id`,
      [userId, 5 * 3600 + 8 * 60, ARTWORK.race],
    );
    const raceId = race.rows[0]!.id;

    await db.query(
      `insert into race_legs (race_id, position, discipline, distance_metres) values
         ($1, 0, 'swim', 1900), ($1, 1, 'ride', 90000), ($1, 2, 'run', 21100)`,
      [raceId],
    );

    await db.query(
      `insert into plans (user_id, race_id, name, status, phase, start_date, end_date,
                          weeks, weekly_planned_hours, current_week_index,
                          current_week_progress, artwork_url)
       values ($1, $2, 'Prep Plan', 'current', 'Base Phase', '2026-09-02', '2027-02-21',
               $3, $4, 1, 0.35, $5),
              ($1, $2, 'Race Plan', 'upcoming', null, '2027-02-22', '2027-07-11',
               $6, $7, null, null, $8)`,
      [userId, raceId, PREP_HOURS.length, PREP_HOURS, ARTWORK.prep, RACE_HOURS.length, RACE_HOURS, ARTWORK.race],
    );

    await db.query(
      `insert into schedules (user_id, available_minutes) values ($1, $2)
       on conflict (user_id) do update set available_minutes = excluded.available_minutes`,
      [userId, [180, 60, 90, 60, 90, 60, 240]],
    );

    await db.query(
      `insert into commitments (user_id, label, weekday, discipline) values
         ($1, 'Weight Training', 1, 'weights'),
         ($1, 'Weight Training', 4, 'weights')`,
      [userId],
    );

    console.log(`Seeded ${email}: 2 plans, 1 race, a schedule and 2 commitments.`);
  });
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: npm run seed -- <email>');
  process.exit(1);
}

try {
  await seed(email);
  await pool.end();
} catch (error) {
  console.error((error as Error).message);
  await pool.end();
  process.exit(1);
}
