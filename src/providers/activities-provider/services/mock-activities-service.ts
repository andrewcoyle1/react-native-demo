/**
 * In-memory `ActivitiesService`.
 *
 * Seeded with the two weeks that were typed into the Activities screen, then
 * extended backwards with generated weeks so there is more history than one page
 * holds. That is deliberate: paging is the thing this slice exists to prove, and
 * a fixture that fits in a single page would never exercise it.
 */
import type { ActivitiesService, ActivityModel, RoutePointModel } from './activities-service';

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
};

const pace = (min: number, sec: number) => min * 60 + sec;
const duration = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;

const RECENT: ActivityTemplate[] = [
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
    sessionId: null,
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
