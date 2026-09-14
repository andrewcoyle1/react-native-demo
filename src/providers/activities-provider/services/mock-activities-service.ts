/**
 * In-memory `ActivitiesService`.
 *
 * Seeded with the two weeks that were typed into the Activities screen, then
 * extended backwards with generated weeks so there is more history than one page
 * holds. That is deliberate: paging is the thing this slice exists to prove, and
 * a fixture that fits in a single page would never exercise it.
 */
import type {
  ActivitiesService,
  ActivityLink,
  ActivityModel,
  ActivityReview,
  LapModel,
  RoutePointModel,
  StreamSample,
} from './activities-service';

import { toDateKey, type ActivitySource, type Discipline } from '@/domain/training';
import type { Page } from '@/providers/shared/paged-state';

import { MOCK_EMPTY_UID } from '@/providers/shared/mock-accounts';

const SettleMs = 150;

/** Weeks of generated history behind the two hand-written ones. */
const GeneratedWeeks = 4;

/** Normalised route shapes, standing in for map tiles. */
const RUN_ROUTE: RoutePointModel[] = [
  { x: 0.04, y: 0.62 }, { x: 0.18, y: 0.55 }, { x: 0.3, y: 0.6 }, { x: 0.44, y: 0.5 },
  { x: 0.58, y: 0.52 }, { x: 0.72, y: 0.44 }, { x: 0.88, y: 0.47 }, { x: 0.97, y: 0.4 },
];

const RIDE_ROUTE: RoutePointModel[] = [
  { x: 0.42, y: 0.08 }, { x: 0.6, y: 0.14 }, { x: 0.66, y: 0.3 }, { x: 0.58, y: 0.46 },
  { x: 0.62, y: 0.62 }, { x: 0.5, y: 0.76 }, { x: 0.34, y: 0.8 }, { x: 0.22, y: 0.68 },
  { x: 0.2, y: 0.5 }, { x: 0.28, y: 0.32 }, { x: 0.42, y: 0.08 },
];

const ALL_SOURCES: ActivitySource[] = ['linked', 'uploaded', 'effort'];

/** Days back from today, and the time of day, so the fixture is date-relative. */
type ActivityTemplate = {
  id: string;
  daysAgo: number;
  at: [number, number];
  title: string;
  discipline: Discipline;
  place?: string;
  route?: RoutePointModel[];
  stats: ActivityModel['stats'];
  sources?: ActivitySource[];
  sessionId?: string;
  laps?: LapModel[];
  samples?: StreamSample[];
  review?: ActivityReview;
  links?: ActivityLink[];
};

const pace = (min: number, sec: number) => min * 60 + sec;
const duration = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;

/**
 * The recorded side of the session the detail sheet was designed against.
 *
 * Generated rather than typed out: the streams are one sample per 100 m over
 * nearly seven kilometres, and the shape that matters — an even aerobic run
 * with four strides late on — is far clearer as the rule that produces it than
 * as seven hundred literal numbers.
 */
const EASY_RUN_METRES = 6900;
const EASY_RUN_SECONDS = duration(0, 35, 2);
/** Where the four strides fall, as a fraction of the run. */
const STRIDE_STARTS = [0.855, 0.885, 0.915, 0.945];

/** Deterministic wobble, so the fixture is the same on every launch. */
function wobble(seed: number): number {
  return Math.sin(seed * 12.9898) * 0.5 + Math.sin(seed * 4.1414) * 0.5;
}

function isStride(fraction: number): boolean {
  return STRIDE_STARTS.some(start => fraction >= start && fraction < start + 0.018);
}

function easyRunSamples(): StreamSample[] {
  const samples: StreamSample[] = [];

  for (let atMetres = 0; atMetres <= EASY_RUN_METRES; atMetres += 100) {
    const fraction = atMetres / EASY_RUN_METRES;
    const stride = isStride(fraction);
    const drift = wobble(atMetres / 100);

    samples.push({
      atMetres,
      // Strides are run at close to 3:20/km; the rest hovers around 5:10.
      paceSecondsPerKm: stride ? pace(3, 22) + drift * 6 : pace(5, 10) + drift * 14,
      // Heart rate lags the effort and climbs gently over the hour.
      heartRate: Math.round((stride ? 178 : 158 + fraction * 14) + drift * 4),
      cadence: Math.round((stride ? 191 : 169 + fraction * 3) + drift * 3),
    });
  }

  return samples;
}

/**
 * Fifteen laps: six steady kilometres, then the strides and their recoveries
 * lapped individually, which is why there are more laps than kilometres.
 */
function easyRunLaps(): LapModel[] {
  const steady = Array.from({ length: 6 }, (_, index) => ({
    index: index + 1,
    distanceMetres: 1000,
    durationSeconds: pace(5, 8) + Math.round(wobble(index) * 9),
  }));

  const strides = STRIDE_STARTS.flatMap((_, index) => [
    { index: 7 + index * 2, distanceMetres: 115, durationSeconds: 23 },
    { index: 8 + index * 2, distanceMetres: 160, durationSeconds: 58 },
  ]);

  const finish = [{ index: 15, distanceMetres: 800, durationSeconds: pace(5, 20) * 0.8 }];

  return [...steady, ...strides, ...finish].map(lap => ({
    ...lap,
    durationSeconds: Math.round(lap.durationSeconds),
    paceSecondsPerKm: Math.round((lap.durationSeconds / lap.distanceMetres) * 1000),
  }));
}

/** Normalised shape of the Malahide coast road loop in the design. */
const EASY_RUN_ROUTE: RoutePointModel[] = [
  { x: 0.06, y: 0.34 }, { x: 0.1, y: 0.46 }, { x: 0.18, y: 0.55 }, { x: 0.28, y: 0.6 },
  { x: 0.36, y: 0.72 }, { x: 0.46, y: 0.78 }, { x: 0.56, y: 0.7 }, { x: 0.6, y: 0.55 },
  { x: 0.58, y: 0.44 }, { x: 0.52, y: 0.4 }, { x: 0.44, y: 0.42 }, { x: 0.36, y: 0.46 },
  { x: 0.3, y: 0.44 }, { x: 0.4, y: 0.4 }, { x: 0.54, y: 0.38 }, { x: 0.68, y: 0.36 },
  { x: 0.8, y: 0.32 }, { x: 0.9, y: 0.34 }, { x: 0.96, y: 0.3 },
];

const RECENT: ActivityTemplate[] = [
  {
    id: 'run-easy-strides-activity',
    daysAgo: 0,
    at: [9, 4],
    title: 'Stamina: 35 min Easy Run w 4 × 20s Strides',
    discipline: 'run',
    place: 'Malahide, IE',
    route: EASY_RUN_ROUTE,
    sessionId: 'run-easy-strides',
    stats: {
      distanceMetres: EASY_RUN_METRES,
      durationSeconds: EASY_RUN_SECONDS,
      paceSecondsPerKm: pace(5, 4),
      averageHeartRate: 166,
      calories: 551,
      elevationMetres: 30,
      averageCadence: 171,
    },
    laps: easyRunLaps(),
    samples: easyRunSamples(),
    review: { rpe: 5, note: null },
    links: [
      { provider: 'strava', url: 'https://www.strava.com/activities/0' },
      { provider: 'garmin', url: 'https://connect.garmin.com/modern/activity/0' },
    ],
  },
  {
    id: 'run-intervals',
    daysAgo: 0,
    at: [13, 57],
    title: 'Stamina: 6 × 2 min Fast Intervals',
    discipline: 'run',
    place: 'Dublin, IE',
    route: RUN_ROUTE,
    stats: { distanceMetres: 5900, durationSeconds: duration(0, 33, 3), paceSecondsPerKm: pace(5, 36) },
  },
  {
    id: 'swim-chest',
    daysAgo: 0,
    at: [11, 51],
    title: 'Stamina: Chest Pressure Cooker (8 rounds)',
    discipline: 'swim',
    stats: {
      distanceMetres: 2700,
      durationSeconds: duration(1, 30, 45),
      paceSecondsPerKm: pace(2, 19) * 10,
    },
  },
  {
    id: 'ride-lunch',
    daysAgo: 1,
    at: [12, 55],
    title: 'Lunch Ride',
    discipline: 'ride',
    place: 'Stapolin, Baldoyle',
    route: RIDE_ROUTE,
    stats: { distanceMetres: 19_000, durationSeconds: duration(0, 46, 21), paceSecondsPerKm: 3600 / 24.6 },
    sources: ['uploaded', 'effort'],
  },
  {
    id: 'gym-lower',
    daysAgo: 1,
    at: [10, 47],
    title: 'Lower',
    discipline: 'weights',
    stats: { durationSeconds: duration(1, 4, 30), averageHeartRate: 100, calories: 345 },
  },
  {
    id: 'ride-easy',
    daysAgo: 1,
    at: [9, 34],
    title: 'Stamina: 45 min Easy Ride',
    discipline: 'ride',
    place: 'Stapolin, Baldoyle',
    route: RIDE_ROUTE,
    stats: { distanceMetres: 19_000, durationSeconds: duration(0, 45, 36), paceSecondsPerKm: 3600 / 25 },
  },
  {
    id: 'run-strides',
    daysAgo: 2,
    at: [17, 20],
    title: 'Stamina: 25 min Easy Run w 4 × 15s Strides',
    discipline: 'run',
    place: 'Malahide, County Dublin',
    route: RUN_ROUTE,
    stats: { distanceMetres: 4400, durationSeconds: duration(0, 25, 6), paceSecondsPerKm: pace(5, 43) },
  },
];

/** A plausible week, repeated backwards so the history is longer than a page. */
const WEEKLY_SHAPE: Omit<ActivityTemplate, 'id' | 'daysAgo'>[] = [
  {
    at: [7, 12],
    title: 'Stamina: 45 min Long Run',
    discipline: 'run',
    place: 'Malahide, County Dublin',
    route: RUN_ROUTE,
    stats: { distanceMetres: 7700, durationSeconds: duration(0, 45, 12), paceSecondsPerKm: pace(5, 53) },
  },
  {
    at: [18, 5],
    title: 'Upper',
    discipline: 'weights',
    stats: { durationSeconds: duration(0, 52, 10), averageHeartRate: 96, calories: 288 },
  },
  {
    at: [9, 40],
    title: 'Stamina: Aerobic Ride',
    discipline: 'ride',
    place: 'Stapolin, Baldoyle',
    route: RIDE_ROUTE,
    stats: { distanceMetres: 20_400, durationSeconds: duration(0, 50, 2), paceSecondsPerKm: 3600 / 24.5 },
  },
  {
    at: [12, 15],
    title: 'Stamina: Technique Set',
    discipline: 'swim',
    stats: {
      distanceMetres: 1700,
      durationSeconds: duration(0, 38, 30),
      paceSecondsPerKm: pace(2, 15) * 10,
    },
  },
];

function at(daysAgo: number, [hour, minute]: [number, number]): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function realise(template: ActivityTemplate): ActivityModel {
  return {
    id: template.id,
    startedAt: at(template.daysAgo, template.at),
    title: template.title,
    discipline: template.discipline,
    place: template.place ?? null,
    route: template.route ?? [],
    sources: template.sources ?? ALL_SOURCES,
    stats: template.stats,
    sessionId: template.sessionId ?? null,
    laps: template.laps ?? [],
    samples: template.samples ?? [],
    review: template.review ?? null,
    links: template.links ?? [],
  };
}

/** The hand-written recent activities, then generated weeks behind them. */
function buildHistory(): ActivityModel[] {
  const history = RECENT.map(realise);

  for (let week = 1; week <= GeneratedWeeks; week += 1) {
    WEEKLY_SHAPE.forEach((shape, index) => {
      history.push(
        realise({
          ...shape,
          id: `w${week}-${index}`,
          // Spread across the week so each generated week fills out a section.
          daysAgo: week * 7 + index,
        }),
      );
    });
  }

  // Newest first, which is the order both reads promise.
  return history.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

const stores = new Map<string, ActivityModel[]>();

function storeFor(uid: string): ActivityModel[] {
  const existing = stores.get(uid);
  if (existing) {
    return existing;
  }
  const seeded = uid === MOCK_EMPTY_UID ? [] : buildHistory();
  stores.set(uid, seeded);
  return seeded;
}

export const mockActivitiesService: ActivitiesService = {
  async get(uid, activityId) {
    return new Promise(resolve =>
      setTimeout(
        () => resolve(storeFor(uid).find(activity => activity.id === activityId) ?? null),
        SettleMs,
      ),
    );
  },

  subscribe(uid, onActivities, _onError) {
    const timer = setTimeout(() => onActivities(storeFor(uid).slice(0, 20)), 0);
    return () => clearTimeout(timer);
  },

  subscribeRange(uid, window, onActivities, _onError) {
    const timer = setTimeout(() => {
      onActivities(
        storeFor(uid).filter(activity => {
          const day = toDateKey(activity.startedAt);
          return day >= window.from && day <= window.to;
        }),
      );
    }, 0);
    return () => clearTimeout(timer);
  },

  list(uid, cursor, pageSize) {
    return new Promise(resolve => {
      setTimeout(() => {
        const history = storeFor(uid);
        // The same cursor arithmetic the Firestore implementation does: take
        // everything strictly older than the token, then a page of it.
        const after = cursor === null ? 0 : history.findIndex(a => a.startedAt.getTime() < Number(cursor));
        const start = after < 0 ? history.length : after;
        const items = history.slice(start, start + pageSize);
        const last = items.at(-1);
        const atEnd = start + items.length >= history.length;

        resolve({
          items,
          cursor: atEnd || !last ? null : String(last.startedAt.getTime()),
        } satisfies Page<ActivityModel>);
      }, SettleMs);
    });
  },
};
