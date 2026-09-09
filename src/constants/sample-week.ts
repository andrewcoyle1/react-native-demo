/**
 * A week of sessions, as the dashboard expects to receive them.
 *
 * Placeholder until the workouts service lands — the same arrangement
 * `PlanCard`'s bars are in. It lives here rather than in the screen so the
 * screen stays about layout, and it is typed against the card's own props so a
 * change to those breaks this file rather than the render.
 */
import type { ChipProps } from '@/components/chip';
import type { IntervalSegment } from '@/components/interval-chart';
import type { WorkoutMetric } from '@/components/workout-card';
import { Accents, Zones } from '@/constants/theme';

import type { SFSymbol } from 'expo-symbols';

/** Disciplines carry one symbol and one colour wherever they appear. */
export const Disciplines = {
  swim: { icon: 'figure.pool.swim' as SFSymbol, accent: Zones.swim },
  run: { icon: 'figure.run' as SFSymbol, accent: Zones.hard },
  ride: { icon: 'bicycle' as SFSymbol, accent: Zones.ride },
  weights: { icon: 'dumbbell' as SFSymbol, accent: '#9AA4AE' },
} as const;

/** The purpose chip that leads a session's tag row. */
const Purpose = {
  recovery: { label: 'Recovery', accent: Accents.recovery, icon: 'arrow.triangle.2.circlepath' },
  endurance: { label: 'Endurance', accent: Accents.endurance, icon: 'infinity' },
  speed: { label: 'Speed', accent: Accents.speed, icon: 'speedometer' },
  commitment: { label: 'Commitment', accent: Accents.commitment, icon: 'arrow.triangle.2.circlepath' },
} as const satisfies Record<string, ChipProps>;

/** Metric tiles keep one icon and colour per quantity across every session. */
function time(value: string, unit?: string, extra?: WorkoutMetric['extra']): WorkoutMetric {
  return { label: 'Time', value, unit, extra, icon: 'clock', accent: Accents.recovery };
}

function distance(label: string, value: string, unit: string): WorkoutMetric {
  return { label, value, unit, icon: 'ruler', accent: Accents.equipment };
}

function speed(label: string, value: string, unit: string): WorkoutMetric {
  return { label, value, unit, icon: 'speedometer', accent: Accents.speed };
}

function load(value: string): WorkoutMetric {
  return { label: 'Load', value, unit: '/10', icon: 'chart.dots.scatter', accent: Accents.commitment };
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
  color: string;
  striped?: boolean;
}): IntervalSegment[] {
  return Array.from({ length: options.count }, (_, index) => ({
    startMinute: options.firstAt + index * options.every,
    durationMinutes: options.duration,
    intensity: options.intensity,
    color: options.color,
    striped: options.striped,
  }));
}

/** Warm-up and cool-down: long, low blocks either end of the work. */
function bookends(totalMinutes: number, warmup: number, cooldown: number, color: string) {
  return [
    { startMinute: 0, durationMinutes: warmup, intensity: 0.28, color },
    {
      startMinute: totalMinutes - cooldown,
      durationMinutes: cooldown,
      intensity: 0.28,
      color,
    },
  ];
}

export type PlannedSession = {
  id: string;
  title: string;
  discipline: keyof typeof Disciplines;
  status?: string;
  tags: ChipProps[];
  metrics?: WorkoutMetric[];
  segments?: IntervalSegment[];
  totalMinutes?: number;
  tickEvery?: number;
  coach?: string;
  note?: string;
};

export type PlannedDay = {
  /** Days from today. 0 is today. */
  dayOffset: number;
  sessions: PlannedSession[];
};

/** The recurring gym commitment, which appears on most days and carries no plan. */
const weightTraining = (dayOffset: number): PlannedSession => ({
  id: `weights-${dayOffset}`,
  title: 'Weight Training',
  discipline: 'weights',
  tags: [Purpose.commitment],
});

export const SAMPLE_WEEK: PlannedDay[] = [
  {
    dayOffset: 0,
    sessions: [
      {
        id: 'swim-today',
        title: 'Chest Pressure Cooker (8 rounds)',
        discipline: 'swim',
        status: 'Completed',
        tags: [
          { label: 'Body position', accent: Accents.info },
          { label: 'Kicking', accent: Accents.info },
          { label: 'Snorkel', accent: Accents.equipment, icon: 'wrench.adjustable' },
          { label: 'Board', accent: Accents.equipment, icon: 'wrench.adjustable' },
        ],
        metrics: [
          { ...time('57', 'min'), label: 'Est. time*' },
          distance('Distance', '2700', 'm'),
          { ...speed('Est. pace', '1:47', '/100m') },
          load('6.2'),
        ],
        totalMinutes: 57,
        segments: [
          { startMinute: 0, durationMinutes: 8, intensity: 0.3, color: Zones.warmup },
          ...reps({
            count: 5,
            firstAt: 9,
            every: 1.4,
            duration: 0.9,
            intensity: 0.35,
            color: Zones.easy,
            striped: true,
          }),
          ...reps({ count: 8, firstAt: 16, every: 4.6, duration: 1, intensity: 0.95, color: Zones.swim }),
          ...reps({ count: 8, firstAt: 17.6, every: 4.6, duration: 1.6, intensity: 0.38, color: Zones.easy, striped: true }),
          { startMinute: 53, durationMinutes: 4, intensity: 0.3, color: Zones.warmup },
        ],
        coach: 'Coach Greg',
        note: 'Our lungs. Ever heard of them? Lungs full of air float, and floating is free speed — so breathe out slowly and let the chest carry you.',
      },
      {
        id: 'run-today',
        title: '12 × 2 min Fast Intervals',
        discipline: 'run',
        status: 'Completed',
        tags: [Purpose.speed, { label: 'Short interval run' }],
        metrics: [
          time('1', 'hr', { value: '8', unit: 'min' }),
          distance('Est. dist*', '12.9', 'km'),
          speed('Est. pace*', '5:25', '/km'),
          load('6.9'),
        ],
        totalMinutes: 68,
        tickEvery: 15,
        segments: [
          ...bookends(68, 12, 10, Zones.easy),
          { startMinute: 12, durationMinutes: 46, intensity: 0.28, color: Zones.easy },
          ...reps({ count: 12, firstAt: 13, every: 3.8, duration: 1.4, intensity: 1, color: Zones.hard }),
        ],
        coach: 'Coach Ari',
        note: 'Each rep should feel fast but controlled. Focus on turnover rather than stride length, and let the recoveries be genuinely slow.',
      },
    ],
  },
  {
    dayOffset: 1,
    sessions: [
      weightTraining(1),
      {
        id: 'ride-aerobic',
        title: '50 min Aerobic Ride',
        discipline: 'ride',
        tags: [Purpose.endurance, { label: 'Aerobic ride' }],
        metrics: [
          time('50', 'min'),
          distance('Est. dist*', '20.4', 'km'),
          speed('Est. speed*', '24.5', 'km/h'),
          load('1.9'),
        ],
        totalMinutes: 50,
        segments: [
          { startMinute: 0, durationMinutes: 12, intensity: 0.5, color: Zones.ride },
          { startMinute: 12, durationMinutes: 28, intensity: 0.95, color: Zones.ride },
          { startMinute: 40, durationMinutes: 10, intensity: 0.5, color: Zones.ride },
        ],
        coach: 'Coach Ari',
        note: 'This is your classic Zone 2 endurance ride. This should feel comfortable enough to hold a conversation the whole way.',
      },
    ],
  },
  {
    dayOffset: 2,
    sessions: [
      weightTraining(2),
      {
        id: 'swim-floating',
        title: 'Relaxed Floating = Relaxed Swimming (2 rounds)',
        discipline: 'swim',
        tags: [
          { label: 'Body position', accent: Accents.info },
          { label: 'Breathing', accent: Accents.info },
          { label: 'Kicking', accent: Accents.info },
          { label: 'Balance', accent: Accents.info },
          { label: 'Board', accent: Accents.equipment, icon: 'wrench.adjustable' },
        ],
        metrics: [
          { ...time('38', 'min'), label: 'Est. time*' },
          distance('Distance', '1700', 'm'),
          speed('Est. pace', '1:45', '/100m'),
          load('4.2'),
        ],
        totalMinutes: 38,
        segments: [
          { startMinute: 0, durationMinutes: 8, intensity: 0.32, color: Zones.warmup },
          ...reps({ count: 4, firstAt: 9, every: 1.2, duration: 0.8, intensity: 0.4, color: Zones.easy, striped: true }),
          ...reps({ count: 14, firstAt: 14, every: 1.4, duration: 0.8, intensity: 0.8, color: Zones.swim }),
          { startMinute: 34, durationMinutes: 4, intensity: 0.32, color: Zones.warmup },
        ],
        coach: 'Coach Greg',
        note: 'A combo float here to force you to move position without losing the line. Slow everything down and feel where the water holds you.',
      },
    ],
  },
  {
    dayOffset: 3,
    sessions: [
      {
        id: 'run-long',
        title: '45 min Long Run',
        discipline: 'run',
        tags: [Purpose.endurance, { label: 'Long run' }],
        metrics: [
          time('45', 'min'),
          distance('Est. dist*', '7.7', 'km'),
          speed('Est. pace*', '5:53', '/km'),
          load('3.3'),
        ],
        totalMinutes: 45,
        segments: [
          { startMinute: 0, durationMinutes: 6, intensity: 0.45, color: Zones.easy },
          { startMinute: 6, durationMinutes: 33, intensity: 0.95, color: Zones.hard },
          { startMinute: 39, durationMinutes: 6, intensity: 0.45, color: Zones.easy },
        ],
        coach: 'Coach Ari',
        note: 'The Long Run is the cornerstone of your run programme. Keep the effort even and finish feeling like you could have gone further.',
      },
      weightTraining(3),
    ],
  },
  {
    dayOffset: 4,
    sessions: [
      {
        id: 'ride-long',
        title: '1 hr 40 min Steady Long Ride',
        discipline: 'ride',
        tags: [Purpose.endurance, { label: 'Long ride' }],
        metrics: [
          time('1', 'hr', { value: '40', unit: 'min' }),
          distance('Est. dist*', '42.1', 'km'),
          speed('Est. speed*', '25.2', 'km/h'),
          load('4.0'),
        ],
        totalMinutes: 100,
        tickEvery: 15,
        segments: [
          { startMinute: 0, durationMinutes: 9, intensity: 0.45, color: Zones.ride },
          { startMinute: 9, durationMinutes: 82, intensity: 1, color: Zones.ride },
          { startMinute: 91, durationMinutes: 9, intensity: 0.45, color: Zones.ride },
        ],
        coach: 'Coach Ari',
        note: 'Settle into a steady rhythm - this is endurance work, not a test. Keep eating and drinking from the first half hour.',
      },
    ],
  },
  {
    dayOffset: 5,
    sessions: [
      weightTraining(5),
      {
        id: 'run-strides',
        title: '35 min Easy Run w 4 × 20s Strides',
        discipline: 'run',
        tags: [Purpose.recovery, { label: 'Easy run' }],
        metrics: [
          time('35', 'min'),
          distance('Est. dist*', '5.9', 'km'),
          speed('Est. pace*', '5:59', '/km'),
          load('2.4'),
        ],
        totalMinutes: 35,
        segments: [
          { startMinute: 0, durationMinutes: 29, intensity: 0.35, color: Zones.easy },
          ...reps({ count: 4, firstAt: 29.5, every: 1.4, duration: 0.4, intensity: 1, color: Zones.sprint }),
          ...reps({ count: 4, firstAt: 30, every: 1.4, duration: 0.9, intensity: 0.35, color: Zones.easy }),
        ],
        coach: 'Coach Ari',
        note: 'Keep this truly easy and conversational. You should finish the strides feeling springy, never strained.',
      },
    ],
  },
  {
    dayOffset: 6,
    sessions: [
      weightTraining(6),
      {
        id: 'ride-easy',
        title: '45 min Easy Ride',
        discipline: 'ride',
        tags: [Purpose.recovery, { label: 'Easy ride' }],
        metrics: [
          time('45', 'min'),
          distance('Est. dist*', '16.6', 'km'),
          speed('Est. speed*', '22.1', 'km/h'),
          load('1.2'),
        ],
        totalMinutes: 45,
        segments: [{ startMinute: 0, durationMinutes: 45, intensity: 1, color: Zones.ride }],
        coach: 'Coach Ari',
        note: 'This ride should be truly easy. You should feel indecently fresh at the end of it — that is the point.',
      },
    ],
  },
];
