/**
 * In-memory `SessionsService`.
 *
 * The fixture is the week that used to live in `src/constants/sample-week.ts`,
 * translated out of component props and into domain values: minutes became
 * seconds, `color: Zones.hard` became `zone: 'hard'`, and `'1:47'` became
 * `paceSecondsPerKm: 1070`. Rendering the mock therefore proves the whole chain
 * — converter, provider, presenter — reproduces the design it started as.
 *
 * `mock-anonymous`, the uid `mockAuthService` gives anonymous sign-in, is seeded
 * with nothing, so every empty branch is reachable without a backend.
 */
import type { SegmentModel, SessionModel, SessionsService } from './sessions-service';

import { addDays, toDateKey, type DateKey, type Zone } from '@/domain/training';

/** Matches the other mocks: long enough that loading states are real. */
const SettleMs = 150;

const ANONYMOUS_UID = 'mock-anonymous';

function settle<T>(work: () => T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(work()), SettleMs));
}

const minutes = (value: number) => Math.round(value * 60);

/** A block of steady effort. */
function block(startMinute: number, durationMinutes: number, intensity: number, zone: Zone): SegmentModel {
  return {
    startSeconds: minutes(startMinute),
    durationSeconds: minutes(durationMinutes),
    intensity,
    zone,
    drill: false,
  };
}

/**
 * An easy block with harder efforts laid over it — the shape most run and swim
 * sessions take. Built rather than written out so the rep count stays the one
 * thing to change.
 */
function reps(options: {
  count: number;
  firstAt: number;
  every: number;
  duration: number;
  intensity: number;
  zone: Zone;
  drill?: boolean;
}): SegmentModel[] {
  return Array.from({ length: options.count }, (_, index) => ({
    startSeconds: minutes(options.firstAt + index * options.every),
    durationSeconds: minutes(options.duration),
    intensity: options.intensity,
    zone: options.zone,
    drill: options.drill ?? false,
  }));
}

/** Warm-up and cool-down: long, low blocks either end of the work. */
function bookends(totalMinutes: number, warmup: number, cooldown: number, zone: Zone): SegmentModel[] {
  return [block(0, warmup, 0.28, zone), block(totalMinutes - cooldown, cooldown, 0.28, zone)];
}

/** Minutes-per-kilometre as seconds, so the fixture reads like a pace. */
const pace = (min: number, sec: number) => min * 60 + sec;

/** Seconds per kilometre from a speed in km/h. */
const fromSpeed = (kmPerHour: number) => Math.round((3600 / kmPerHour) * 10) / 10;

/** Seconds per kilometre from a swim pace per 100 m. */
const fromSwimPace = (min: number, sec: number) => (min * 60 + sec) * 10;

/** The recurring gym commitment, which appears on most days and carries no plan. */
function weightTraining(dayOffset: number, order: number): SessionTemplate {
  return {
    id: `weights-${dayOffset}`,
    dayOffset,
    order,
    title: 'Weight Training',
    discipline: 'weights',
    purpose: 'commitment',
  };
}

/**
 * A fixture entry: a `SessionModel` with the date still expressed as an offset
 * from today, and with everything a bare commitment does not need made optional
 * so `weightTraining` can be four lines.
 */
type Optional =
  | 'focus'
  | 'equipment'
  | 'descriptor'
  | 'targets'
  | 'segments'
  | 'chartSeconds'
  | 'tickEveryMinutes'
  | 'coachName'
  | 'coachNote';

type SessionTemplate = Omit<SessionModel, 'date' | 'completion' | Optional> &
  Partial<Pick<SessionModel, Optional>> & {
    dayOffset: number;
    completed?: boolean;
  };

const WEEK: SessionTemplate[] = [
  {
    id: 'swim-today',
    dayOffset: 0,
    order: 0,
    title: 'Chest Pressure Cooker (8 rounds)',
    discipline: 'swim',
    purpose: null,
    completed: true,
    focus: ['Body position', 'Kicking'],
    equipment: ['Snorkel', 'Board'],
    descriptor: null,
    targets: {
      durationSeconds: minutes(57),
      distanceMetres: 2700,
      paceSecondsPerKm: fromSwimPace(1, 47),
      load: 6.2,
      estimated: true,
    },
    chartSeconds: minutes(57),
    tickEveryMinutes: null,
    segments: [
      block(0, 8, 0.3, 'warmup'),
      ...reps({ count: 5, firstAt: 9, every: 1.4, duration: 0.9, intensity: 0.35, zone: 'easy', drill: true }),
      ...reps({ count: 8, firstAt: 16, every: 4.6, duration: 1, intensity: 0.95, zone: 'swim' }),
      ...reps({ count: 8, firstAt: 17.6, every: 4.6, duration: 1.6, intensity: 0.38, zone: 'easy', drill: true }),
      block(53, 4, 0.3, 'warmup'),
    ],
    coachName: 'Coach Greg',
    coachNote:
      'Our lungs. Ever heard of them? Lungs full of air float, and floating is free speed — so breathe out slowly and let the chest carry you.',
  },
  {
    id: 'run-today',
    dayOffset: 0,
    order: 1,
    title: '12 × 2 min Fast Intervals',
    discipline: 'run',
    purpose: 'speed',
    completed: true,
    descriptor: 'Short interval run',
    targets: {
      durationSeconds: minutes(68),
      distanceMetres: 12_900,
      paceSecondsPerKm: pace(5, 25),
      load: 6.9,
      estimated: true,
    },
    chartSeconds: minutes(68),
    tickEveryMinutes: 15,
    segments: [
      ...bookends(68, 12, 10, 'easy'),
      block(12, 46, 0.28, 'easy'),
      ...reps({ count: 12, firstAt: 13, every: 3.8, duration: 1.4, intensity: 1, zone: 'hard' }),
    ],
    coachName: 'Coach Ari',
    coachNote:
      'Each rep should feel fast but controlled. Focus on turnover rather than stride length, and let the recoveries be genuinely slow.',
  },
  weightTraining(1, 0),
  {
    id: 'ride-aerobic',
    dayOffset: 1,
    order: 1,
    title: '50 min Aerobic Ride',
    discipline: 'ride',
    purpose: 'endurance',
    descriptor: 'Aerobic ride',
    targets: {
      durationSeconds: minutes(50),
      distanceMetres: 20_400,
      paceSecondsPerKm: fromSpeed(24.5),
      load: 1.9,
      estimated: true,
    },
    chartSeconds: minutes(50),
    tickEveryMinutes: null,
    segments: [block(0, 12, 0.5, 'ride'), block(12, 28, 0.95, 'ride'), block(40, 10, 0.5, 'ride')],
    coachName: 'Coach Ari',
    coachNote:
      'This is your classic Zone 2 endurance ride. This should feel comfortable enough to hold a conversation the whole way.',
  },
  weightTraining(2, 0),
  {
    id: 'swim-floating',
    dayOffset: 2,
    order: 1,
    title: 'Relaxed Floating = Relaxed Swimming (2 rounds)',
    discipline: 'swim',
    purpose: null,
    focus: ['Body position', 'Breathing', 'Kicking', 'Balance'],
    equipment: ['Board'],
    descriptor: null,
    targets: {
      durationSeconds: minutes(38),
      distanceMetres: 1700,
      paceSecondsPerKm: fromSwimPace(1, 45),
      load: 4.2,
      estimated: true,
    },
    chartSeconds: minutes(38),
    tickEveryMinutes: null,
    segments: [
      block(0, 8, 0.32, 'warmup'),
      ...reps({ count: 4, firstAt: 9, every: 1.2, duration: 0.8, intensity: 0.4, zone: 'easy', drill: true }),
      ...reps({ count: 14, firstAt: 14, every: 1.4, duration: 0.8, intensity: 0.8, zone: 'swim' }),
      block(34, 4, 0.32, 'warmup'),
    ],
    coachName: 'Coach Greg',
    coachNote:
      'A combo float here to force you to move position without losing the line. Slow everything down and feel where the water holds you.',
  },
  {
    id: 'run-long',
    dayOffset: 3,
    order: 0,
    title: '45 min Long Run',
    discipline: 'run',
    purpose: 'endurance',
    descriptor: 'Long run',
    targets: {
      durationSeconds: minutes(45),
      distanceMetres: 7700,
      paceSecondsPerKm: pace(5, 53),
      load: 3.3,
      estimated: true,
    },
    chartSeconds: minutes(45),
    tickEveryMinutes: null,
    segments: [block(0, 6, 0.45, 'easy'), block(6, 33, 0.95, 'hard'), block(39, 6, 0.45, 'easy')],
    coachName: 'Coach Ari',
    coachNote:
      'The Long Run is the cornerstone of your run programme. Keep the effort even and finish feeling like you could have gone further.',
  },
  weightTraining(3, 1),
  {
    id: 'ride-long',
    dayOffset: 4,
    order: 0,
    title: '1 hr 40 min Steady Long Ride',
    discipline: 'ride',
    purpose: 'endurance',
    descriptor: 'Long ride',
    targets: {
      durationSeconds: minutes(100),
      distanceMetres: 42_100,
      paceSecondsPerKm: fromSpeed(25.2),
      load: 4.0,
      estimated: true,
    },
    chartSeconds: minutes(100),
    tickEveryMinutes: 15,
    segments: [block(0, 9, 0.45, 'ride'), block(9, 82, 1, 'ride'), block(91, 9, 0.45, 'ride')],
    coachName: 'Coach Ari',
    coachNote:
      'Settle into a steady rhythm - this is endurance work, not a test. Keep eating and drinking from the first half hour.',
  },
  weightTraining(5, 0),
  {
    id: 'run-strides',
    dayOffset: 5,
    order: 1,
    title: '35 min Easy Run w 4 × 20s Strides',
    discipline: 'run',
    purpose: 'recovery',
    descriptor: 'Easy run',
    targets: {
      durationSeconds: minutes(35),
      distanceMetres: 5900,
      paceSecondsPerKm: pace(5, 59),
      load: 2.4,
      estimated: true,
    },
    chartSeconds: minutes(35),
    tickEveryMinutes: null,
    segments: [
      block(0, 29, 0.35, 'easy'),
      ...reps({ count: 4, firstAt: 29.5, every: 1.4, duration: 0.4, intensity: 1, zone: 'sprint' }),
      ...reps({ count: 4, firstAt: 30, every: 1.4, duration: 0.9, intensity: 0.35, zone: 'easy' }),
    ],
    coachName: 'Coach Ari',
    coachNote:
      'Keep this truly easy and conversational. You should finish the strides feeling springy, never strained.',
  },
  weightTraining(6, 0),
  {
    id: 'ride-easy',
    dayOffset: 6,
    order: 1,
    title: '45 min Easy Ride',
    discipline: 'ride',
    purpose: 'recovery',
    descriptor: 'Easy ride',
    targets: {
      durationSeconds: minutes(45),
      distanceMetres: 16_600,
      paceSecondsPerKm: fromSpeed(22.1),
      load: 1.2,
      estimated: true,
    },
    chartSeconds: minutes(45),
    tickEveryMinutes: null,
    segments: [block(0, 45, 1, 'ride')],
    coachName: 'Coach Ari',
    coachNote:
      'This ride should be truly easy. You should feel indecently fresh at the end of it — that is the point.',
  },
];

/** Fills in the fields the template leaves out and resolves the offset to a date. */
function realise(template: SessionTemplate, weekStart: DateKey): SessionModel {
  return {
    id: template.id,
    date: addDays(weekStart, template.dayOffset),
    order: template.order,
    title: template.title,
    discipline: template.discipline,
    purpose: template.purpose,
    focus: template.focus ?? [],
    equipment: template.equipment ?? [],
    descriptor: template.descriptor ?? null,
    targets: template.targets ?? {},
    segments: template.segments ?? [],
    chartSeconds: template.chartSeconds ?? null,
    tickEveryMinutes: template.tickEveryMinutes ?? null,
    completion: template.completed ? { completedAt: new Date(), activityId: null } : null,
    coachName: template.coachName ?? null,
    coachNote: template.coachNote ?? null,
  };
}

/**
 * The Monday of the current training week.
 *
 * The fixture is anchored here rather than to today, because the Plan tab shows
 * a Monday-to-Sunday week and would otherwise find the first half of it empty.
 */
function currentMonday(): DateKey {
  const today = new Date();
  // getDay is 0 on Sunday, which belongs to the week that began six days back.
  return addDays(toDateKey(today), -((today.getDay() + 6) % 7));
}

/** Per-uid store, built on first read so the offsets resolve against today. */
const stores = new Map<string, SessionModel[]>();

function storeFor(uid: string): SessionModel[] {
  const existing = stores.get(uid);
  if (existing) {
    return existing;
  }

  const monday = currentMonday();

  // Two weeks, so both windows are fully covered: the Plan tab's Monday-to-Sunday
  // week, and the dashboard's seven days from today, which run into next week.
  const seeded =
    uid === ANONYMOUS_UID
      ? []
      : [0, 7].flatMap(offset =>
          WEEK.map(template =>
            realise(
              { ...template, id: offset === 0 ? template.id : `${template.id}-w2` },
              addDays(monday, offset),
            ),
          ),
        );

  stores.set(uid, seeded);
  return seeded;
}

type Listener = { uid: string; deliver: () => void };

const listeners = new Set<Listener>();

function notify(uid: string) {
  listeners.forEach(listener => {
    if (listener.uid === uid) {
      listener.deliver();
    }
  });
}

export const mockSessionsService: SessionsService = {
  subscribe(uid, window, onSessions, _onError) {
    const deliver = () => {
      const sessions = storeFor(uid)
        .filter(session => session.date >= window.from && session.date <= window.to)
        .sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));
      onSessions(sessions);
    };

    // First delivery is deferred so a consumer always sees `loading` first,
    // exactly as a real listener behaves.
    const timer = setTimeout(deliver, 0);
    const listener: Listener = { uid, deliver };
    listeners.add(listener);

    return () => {
      clearTimeout(timer);
      listeners.delete(listener);
    };
  },

  async markComplete(uid, sessionId, completion) {
    await settle(() => {
      const store = storeFor(uid);
      const index = store.findIndex(session => session.id === sessionId);
      if (index >= 0) {
        store[index] = { ...store[index], completion };
      }
    });
    notify(uid);
  },
};
