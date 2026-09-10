/**
 * Firestore implementation of `TrainingService`.
 *
 * Three paths, all under the athlete's own document:
 *   users/{uid}/plans/{planId}
 *   users/{uid}/races/{raceId}
 *   users/{uid}/schedule/current
 *
 * The schedule is a fixed document id rather than a collection: there is exactly
 * one, and giving it a known name means reading it is a document listener rather
 * than a query.
 */
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@react-native-firebase/firestore';

import type {
  Commitment,
  PlanModel,
  RaceLeg,
  RaceModel,
  ScheduleModel,
  TrainingService,
} from './training-service';

import { DISCIPLINES } from '@/domain/training';
import {
  readArray,
  readDate,
  readDateKey,
  readEnum,
  readNumber,
  readString,
  type RawData,
} from '@/providers/shared/firestore';

const PLAN_STATUSES = ['current', 'upcoming', 'complete'] as const;
const RACE_PRIORITIES = ['A', 'B', 'C'] as const;

/** The one schedule document each athlete has. */
const ScheduleDocId = 'current';

/** Seven days, no time available, which is what an unset schedule means. */
const NoAvailability = [0, 0, 0, 0, 0, 0, 0];

function plansCollection(uid: string) {
  return collection(getFirestore(), 'users', uid, 'plans');
}

function racesCollection(uid: string) {
  return collection(getFirestore(), 'users', uid, 'races');
}

function scheduleDoc(uid: string) {
  return doc(getFirestore(), 'users', uid, 'schedule', ScheduleDocId);
}

/** Numbers only, so a malformed bar cannot make the chart draw a gap. */
function readNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    : [];
}

function toPlanModel(id: string, data: RawData): PlanModel | null {
  const name = readString(data?.name);
  const status = readEnum(data?.status, PLAN_STATUSES);
  const startDate = readDateKey(data?.startDate);
  const endDate = readDateKey(data?.endDate);

  if (!name || !status || !startDate || !endDate) {
    return null;
  }

  const weeklyPlannedHours = readNumberArray(data?.weeklyPlannedHours);

  return {
    id,
    name,
    status,
    startDate,
    endDate,
    weeklyPlannedHours,
    phase: readString(data?.phase) ?? null,
    // Falls back to the length of the chart, so the two can never disagree.
    weeks: readNumber(data?.weeks) ?? weeklyPlannedHours.length,
    currentWeekIndex: readNumber(data?.currentWeekIndex) ?? null,
    currentWeekProgress: readNumber(data?.currentWeekProgress) ?? null,
    raceId: readString(data?.raceId) ?? null,
    artworkUrl: readString(data?.artworkUrl) ?? null,
  };
}

function toRaceLeg(data: RawData): RaceLeg | null {
  const discipline = readEnum(data?.discipline, DISCIPLINES);
  const distanceMetres = readNumber(data?.distanceMetres);

  if (!discipline || distanceMetres === undefined) {
    return null;
  }

  return { discipline, distanceMetres };
}

function toRaceModel(id: string, data: RawData): RaceModel | null {
  const name = readString(data?.name);
  const date = readDateKey(data?.date);

  if (!name || !date) {
    return null;
  }

  return {
    id,
    name,
    date,
    place: readString(data?.place) ?? '',
    // An unprioritised race is treated as a C race: the ladder has to place it
    // somewhere, and the lowest rung is the safe assumption.
    priority: readEnum(data?.priority, RACE_PRIORITIES) ?? 'C',
    legs: readArray(data?.legs, toRaceLeg),
    targetSeconds: readNumber(data?.targetSeconds) ?? null,
    artworkUrl: readString(data?.artworkUrl) ?? null,
  };
}

function toCommitment(data: RawData): Commitment | null {
  const id = readString(data?.id);
  const label = readString(data?.label);
  const weekday = readNumber(data?.weekday);

  if (!id || !label || weekday === undefined || weekday < 0 || weekday > 6) {
    return null;
  }

  return { id, label, weekday, discipline: readEnum(data?.discipline, DISCIPLINES) ?? null };
}

function toScheduleModel(data: RawData): ScheduleModel | null {
  if (!data) {
    return null;
  }

  const availableMinutes = readNumberArray(data.availableMinutes);

  return {
    // A schedule with the wrong number of days is treated as unset rather than
    // padded, so a weekday index can never run off the end of it.
    availableMinutes: availableMinutes.length === 7 ? availableMinutes : NoAvailability,
    commitments: readArray(data.commitments, toCommitment),
    modifiedAt: readDate(data.modifiedAt) ?? null,
  };
}

export const firebaseTrainingService: TrainingService = {
  subscribePlans(uid, onPlans, onError) {
    // Completed plans are excluded at the query: an athlete accumulates them,
    // and no screen shows one.
    const plansQuery = query(
      plansCollection(uid),
      where('status', 'in', ['current', 'upcoming']),
      orderBy('startDate'),
    );

    return onSnapshot(
      plansQuery,
      snapshot => {
        onPlans(
          snapshot.docs
            .map(document => toPlanModel(document.id, document.data()))
            .filter((plan): plan is PlanModel => plan !== null),
        );
      },
      onError,
    );
  },

  subscribeRaces(uid, onRaces, onError) {
    return onSnapshot(
      query(racesCollection(uid), orderBy('date')),
      snapshot => {
        onRaces(
          snapshot.docs
            .map(document => toRaceModel(document.id, document.data()))
            .filter((race): race is RaceModel => race !== null),
        );
      },
      onError,
    );
  },

  subscribeSchedule(uid, onSchedule, onError) {
    return onSnapshot(
      scheduleDoc(uid),
      snapshot => onSchedule(toScheduleModel(snapshot.data())),
      onError,
    );
  },

  async updateSchedule(uid, changes) {
    // `setDoc` with a merge rather than `updateDoc`: the schedule document does
    // not exist until the athlete first sets one, and the first edit should
    // create it rather than fail.
    await setDoc(
      scheduleDoc(uid),
      {
        ...(changes.availableMinutes !== undefined
          ? { availableMinutes: changes.availableMinutes }
          : {}),
        ...(changes.commitments !== undefined ? { commitments: changes.commitments } : {}),
        modifiedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },
};
