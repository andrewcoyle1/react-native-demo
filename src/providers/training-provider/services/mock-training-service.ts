/**
 * In-memory `TrainingService`.
 *
 * Seeded with the plans, race and targets that were typed into the dashboard
 * carousel and the profile card. The countdowns are no longer part of the
 * fixture: the race has a fixed date and "305 days" is derived from it, so the
 * number is right tomorrow as well as today.
 *
 * `mock-anonymous` gets nothing, so the no-plan branch is reachable.
 */
import type {
  PlanModel,
  RaceModel,
  ScheduleDraft,
  ScheduleModel,
  TrainingService,
} from './training-service';

const SettleMs = 150;
const ANONYMOUS_UID = 'mock-anonymous';

function settle<T>(work: () => T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(work()), SettleMs));
}

const RACE_ID = 'im703-luxembourg';

const RACES: RaceModel[] = [
  {
    id: RACE_ID,
    name: 'IRONMAN 70.3 Luxembourg',
    place: 'Moselle, Luxembourg 🇱🇺',
    date: '2027-07-11',
    priority: 'A',
    legs: [
      { discipline: 'swim', distanceMetres: 1900 },
      { discipline: 'ride', distanceMetres: 90_000 },
      { discipline: 'run', distanceMetres: 21_100 },
    ],
    /** 5h 08m. */
    targetSeconds: 5 * 3600 + 8 * 60,
    artworkUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800',
  },
];

const PLANS: PlanModel[] = [
  {
    id: 'prep-plan',
    name: 'Prep Plan',
    status: 'current',
    phase: 'Base Phase',
    startDate: '2026-09-02',
    endDate: '2027-02-21',
    weeks: 24,
    weeklyPlannedHours: [
      8, 9, 7, 10, 11, 9, 12, 13, 10, 14, 12, 15, 13, 16, 14, 11, 17, 15, 18, 16, 13, 19, 17, 12, 8,
    ],
    currentWeekIndex: 1,
    currentWeekProgress: 0.35,
    raceId: RACE_ID,
    artworkUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800',
  },
  {
    id: 'race-plan',
    name: 'Race Plan',
    status: 'upcoming',
    phase: null,
    startDate: '2027-02-22',
    endDate: '2027-07-11',
    weeks: 20,
    weeklyPlannedHours: [
      6, 9, 7, 11, 8, 12, 9, 13, 10, 14, 11, 15, 12, 16, 13, 10, 17, 14, 18, 15, 12, 19, 16, 11, 7,
    ],
    // Nothing of an upcoming plan is done yet, so every bar stays unfilled and
    // the chart carries no target.
    currentWeekIndex: null,
    currentWeekProgress: null,
    raceId: RACE_ID,
    artworkUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800',
  },
];

/** Five weekday evenings and longer at the weekend — a plausible starting week. */
const SCHEDULE: ScheduleModel = {
  availableMinutes: [180, 60, 90, 60, 90, 60, 240],
  commitments: [
    { id: 'gym-mon', label: 'Weight Training', weekday: 1, discipline: 'weights' },
    { id: 'gym-thu', label: 'Weight Training', weekday: 4, discipline: 'weights' },
  ],
  modifiedAt: null,
};

const schedules = new Map<string, ScheduleModel | null>();

function scheduleFor(uid: string): ScheduleModel | null {
  if (!schedules.has(uid)) {
    schedules.set(uid, uid === ANONYMOUS_UID ? null : { ...SCHEDULE });
  }
  return schedules.get(uid) ?? null;
}

type Listener = { uid: string; deliver: () => void };
const scheduleListeners = new Set<Listener>();

/** Delivers once on the next tick, so a consumer always sees `loading` first. */
function deferred(deliver: () => void) {
  const timer = setTimeout(deliver, 0);
  return () => clearTimeout(timer);
}

export const mockTrainingService: TrainingService = {
  subscribePlans(uid, onPlans, _onError) {
    return deferred(() => onPlans(uid === ANONYMOUS_UID ? [] : PLANS));
  },

  subscribeRaces(uid, onRaces, _onError) {
    return deferred(() => onRaces(uid === ANONYMOUS_UID ? [] : RACES));
  },

  subscribeSchedule(uid, onSchedule, _onError) {
    const deliver = () => onSchedule(scheduleFor(uid));
    const cancel = deferred(deliver);
    const listener: Listener = { uid, deliver };
    scheduleListeners.add(listener);

    return () => {
      cancel();
      scheduleListeners.delete(listener);
    };
  },

  async updateSchedule(uid, changes: Partial<ScheduleDraft>) {
    await settle(() => {
      const existing = scheduleFor(uid) ?? { ...SCHEDULE, commitments: [] };
      schedules.set(uid, { ...existing, ...changes, modifiedAt: new Date() });
    });
    scheduleListeners.forEach(listener => {
      if (listener.uid === uid) {
        listener.deliver();
      }
    });
  },
};
