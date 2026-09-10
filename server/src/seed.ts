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

    const sessions = await seedSessions(db, userId);

    console.log(
      `Seeded ${email}: 2 plans, 1 race, a schedule, 2 commitments and ${sessions} sessions.`,
    );
  });
}

/** Monday of the current training week, in the server's local zone. */
function currentMonday(): Date {
  const today = new Date();
  // getDay is 0 on Sunday, which belongs to the week that began six days back.
  today.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  today.setHours(0, 0, 0, 0);
  return today;
}

function dayKey(from: Date, offset: number): string {
  const date = new Date(from);
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, '0'),
    `${date.getDate()}`.padStart(2, '0'),
  ].join('-');
}

type SeedSession = {
  offset: number;
  position: number;
  title: string;
  discipline: string;
  purpose: string | null;
  focus?: string[];
  equipment?: string[];
  descriptor?: string;
  durationSeconds?: number;
  distanceMetres?: number;
  paceSecondsPerKm?: number;
  load?: number;
  coach?: string;
  note?: string;
  /** [startSeconds, durationSeconds, intensity, zone, drill?] */
  segments?: [number, number, number, string, boolean?][];
};

/** A training week: two key sessions most days, a gym commitment alongside. */
const WEEK: SeedSession[] = [
  {
    offset: 0, position: 0, title: 'Chest Pressure Cooker (8 rounds)',
    discipline: 'swim', purpose: null,
    focus: ['Body position', 'Kicking'], equipment: ['Snorkel', 'Board'],
    durationSeconds: 3420, distanceMetres: 2700, paceSecondsPerKm: 1070, load: 6.2,
    coach: 'Coach Greg',
    note: 'Lungs full of air float, and floating is free speed — breathe out slowly and let the chest carry you.',
    segments: [[0, 480, 0.3, 'warmup'], [540, 360, 0.35, 'easy', true], [960, 2400, 0.95, 'swim'], [3180, 240, 0.3, 'warmup']],
  },
  {
    offset: 0, position: 1, title: '12 × 2 min Fast Intervals',
    discipline: 'run', purpose: 'speed', descriptor: 'Short interval run',
    durationSeconds: 4080, distanceMetres: 12900, paceSecondsPerKm: 325, load: 6.9,
    coach: 'Coach Ari',
    note: 'Fast but controlled. Focus on turnover rather than stride length, and let the recoveries be genuinely slow.',
    segments: [[0, 720, 0.28, 'easy'], [780, 2760, 1, 'hard'], [3480, 600, 0.28, 'easy']],
  },
  { offset: 1, position: 0, title: 'Weight Training', discipline: 'weights', purpose: 'commitment' },
  {
    offset: 1, position: 1, title: '50 min Aerobic Ride',
    discipline: 'ride', purpose: 'endurance', descriptor: 'Aerobic ride',
    durationSeconds: 3000, distanceMetres: 20400, paceSecondsPerKm: 146.9, load: 1.9,
    coach: 'Coach Ari',
    note: 'Classic Zone 2. Comfortable enough to hold a conversation the whole way.',
    segments: [[0, 720, 0.5, 'ride'], [720, 1680, 0.95, 'ride'], [2400, 600, 0.5, 'ride']],
  },
  {
    offset: 2, position: 0, title: 'Relaxed Floating = Relaxed Swimming',
    discipline: 'swim', purpose: null,
    focus: ['Body position', 'Breathing', 'Balance'], equipment: ['Board'],
    durationSeconds: 2280, distanceMetres: 1700, paceSecondsPerKm: 1050, load: 4.2,
    coach: 'Coach Greg', note: 'Slow everything down and feel where the water holds you.',
    segments: [[0, 480, 0.32, 'warmup'], [540, 360, 0.4, 'easy', true], [900, 1140, 0.8, 'swim'], [2040, 240, 0.32, 'warmup']],
  },
  {
    offset: 3, position: 0, title: '45 min Long Run',
    discipline: 'run', purpose: 'endurance', descriptor: 'Long run',
    durationSeconds: 2700, distanceMetres: 7700, paceSecondsPerKm: 353, load: 3.3,
    coach: 'Coach Ari',
    note: 'The cornerstone of your run programme. Finish feeling like you could have gone further.',
    segments: [[0, 360, 0.45, 'easy'], [360, 1980, 0.95, 'hard'], [2340, 360, 0.45, 'easy']],
  },
  { offset: 3, position: 1, title: 'Weight Training', discipline: 'weights', purpose: 'commitment' },
  {
    offset: 4, position: 0, title: '1 hr 40 min Steady Long Ride',
    discipline: 'ride', purpose: 'endurance', descriptor: 'Long ride',
    durationSeconds: 6000, distanceMetres: 42100, paceSecondsPerKm: 142.9, load: 4,
    coach: 'Coach Ari', note: 'Settle into a rhythm. Keep eating and drinking from the first half hour.',
    segments: [[0, 540, 0.45, 'ride'], [540, 4920, 1, 'ride'], [5460, 540, 0.45, 'ride']],
  },
  {
    offset: 5, position: 0, title: '35 min Easy Run w 4 × 20s Strides',
    discipline: 'run', purpose: 'recovery', descriptor: 'Easy run',
    durationSeconds: 2100, distanceMetres: 5900, paceSecondsPerKm: 359, load: 2.4,
    coach: 'Coach Ari', note: 'Truly easy and conversational. Finish the strides springy, never strained.',
    segments: [[0, 1740, 0.35, 'easy'], [1770, 24, 1, 'sprint'], [1854, 24, 1, 'sprint'], [1938, 24, 1, 'sprint']],
  },
  {
    offset: 6, position: 0, title: '45 min Easy Ride',
    discipline: 'ride', purpose: 'recovery', descriptor: 'Easy ride',
    durationSeconds: 2700, distanceMetres: 16600, paceSecondsPerKm: 162.9, load: 1.2,
    coach: 'Coach Ari', note: 'Truly easy. You should feel indecently fresh at the end of it.',
    segments: [[0, 2700, 1, 'ride']],
  },
];

/**
 * Two weeks from this Monday, so both windows the app reads are covered: the
 * Plan tab's Monday-to-Sunday week, and the dashboard's seven days from today
 * which run into next week.
 */
async function seedSessions(
  db: Parameters<Parameters<typeof transaction>[0]>[0],
  userId: string,
): Promise<number> {
  await db.query('delete from sessions where user_id = $1', [userId]);

  const monday = currentMonday();
  let count = 0;

  for (const week of [0, 7]) {
    for (const session of WEEK) {
      const { rows } = await db.query<{ id: string }>(
        `insert into sessions (user_id, date, position, title, discipline, purpose,
                               focus, equipment, descriptor, duration_seconds,
                               distance_metres, pace_seconds_per_km, load, estimated,
                               chart_seconds, coach_name, coach_note)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $10, $14, $15)
         returning id`,
        [
          userId, dayKey(monday, week + session.offset), session.position,
          session.title, session.discipline, session.purpose,
          session.focus ?? [], session.equipment ?? [], session.descriptor ?? null,
          session.durationSeconds ?? null, session.distanceMetres ?? null,
          session.paceSecondsPerKm ?? null, session.load ?? null,
          session.coach ?? null, session.note ?? null,
        ],
      );

      const id = rows[0]!.id;
      count += 1;

      for (const [index, segment] of (session.segments ?? []).entries()) {
        await db.query(
          `insert into session_segments
             (session_id, position, start_seconds, duration_seconds, intensity, zone, drill)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [id, index, segment[0], segment[1], segment[2], segment[3], segment[4] ?? false],
        );
      }
    }
  }

  return count;
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
