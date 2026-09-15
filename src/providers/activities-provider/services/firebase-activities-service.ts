/**
 * Firestore implementation of `ActivitiesService`, over `users/{uid}/activities`.
 *
 * The cursor is the one thing worth reading closely. Firestore's own pagination
 * takes a `DocumentSnapshot`, which cannot cross the seam without dragging the
 * SDK up with it. `startAfter` also accepts the values of the ordering fields,
 * so this encodes `startedAt` as epoch milliseconds and hands that back as an
 * opaque string — no snapshot escapes, and no cursor state is held anywhere.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
} from '@react-native-firebase/firestore';

import type {
  ActivitiesService,
  ActivityLink,
  ActivityModel,
  ActivityReview,
  ActivityStats,
  LapModel,
  RoutePointModel,
  StreamSample,
} from './activities-service';

import { ACTIVITY_PROVIDERS, ACTIVITY_SOURCES, DISCIPLINES, fromDateKey } from '@/domain/training';
import {
  readArray,
  readDate,
  readEnum,
  readEnumArray,
  readMap,
  readNumber,
  readString,
  type RawData,
} from '@/providers/shared/firestore';

/** The day after `date`, so an inclusive date window becomes a half-open one. */
function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** How many recent activities the freshness listener holds open. */
const LiveLimit = 20;

function activitiesCollection(uid: string) {
  return collection(getFirestore(), 'users', uid, 'activities');
}

function toRoutePoint(data: RawData): RoutePointModel | null {
  const x = readNumber(data?.x);
  const y = readNumber(data?.y);
  return x === undefined || y === undefined ? null : { x, y };
}

function toStats(data: RawData): ActivityStats {
  return {
    distanceMetres: readNumber(data?.distanceMetres),
    durationSeconds: readNumber(data?.durationSeconds),
    paceSecondsPerKm: readNumber(data?.paceSecondsPerKm),
    averageHeartRate: readNumber(data?.averageHeartRate),
    calories: readNumber(data?.calories),
    elevationMetres: readNumber(data?.elevationMetres),
    averageCadence: readNumber(data?.averageCadence),
  };
}

/**
 * A lap is dropped unless it has both a distance and a duration: the chart
 * plots pace, and a lap missing either has no pace to plot.
 */
function toLap(data: RawData): LapModel | null {
  const index = readNumber(data?.index);
  const distanceMetres = readNumber(data?.distanceMetres);
  const durationSeconds = readNumber(data?.durationSeconds);

  if (index === undefined || !distanceMetres || durationSeconds === undefined) {
    return null;
  }

  return {
    index,
    distanceMetres,
    durationSeconds,
    // Derived rather than read: a stored pace that disagrees with the distance
    // and duration beside it would draw a bar that contradicts its own label.
    paceSecondsPerKm: Math.round((durationSeconds / distanceMetres) * 1000),
  };
}

/** Every measure is optional; only the position along the route is required. */
function toSample(data: RawData): StreamSample | null {
  const atMetres = readNumber(data?.atMetres);
  if (atMetres === undefined) {
    return null;
  }

  return {
    atMetres,
    paceSecondsPerKm: readNumber(data?.paceSecondsPerKm),
    heartRate: readNumber(data?.heartRate),
    cadence: readNumber(data?.cadence),
  };
}

function toReview(data: RawData): ActivityReview | null {
  const rpe = readNumber(data?.rpe);
  return rpe === undefined ? null : { rpe, note: readString(data?.note) ?? null };
}

function toLink(data: RawData): ActivityLink | null {
  const provider = readEnum(data?.provider, ACTIVITY_PROVIDERS);
  const url = readString(data?.url);
  return provider === undefined || url === undefined ? null : { provider, url };
}

function toActivityModel(id: string, data: RawData): ActivityModel | null {
  const startedAt = readDate(data?.startedAt);
  const title = readString(data?.title);
  const discipline = readEnum(data?.discipline, DISCIPLINES);

  // Without a start time an activity cannot be placed in a week or paged past,
  // so it is dropped rather than dated to now.
  if (!startedAt || !title || !discipline) {
    return null;
  }

  return {
    id,
    startedAt,
    title,
    discipline,
    place: readString(data?.place) ?? null,
    route: readArray(data?.route, toRoutePoint),
    sources: readEnumArray(data?.sources, ACTIVITY_SOURCES),
    stats: toStats(readMap(data?.stats)),
    sessionId: readString(data?.sessionId) ?? null,
    /*
     * Present on a document read one at a time, absent from a listed one only
     * because the writer leaves them off there. Reading them unconditionally
     * costs nothing when the fields are missing and keeps one converter.
     */
    laps: readArray(data?.laps, toLap),
    samples: readArray(data?.samples, toSample),
    review: toReview(readMap(data?.review)),
    links: readArray(data?.links, toLink),
  };
}

/** The cursor is `startedAt` as epoch milliseconds, in a string. */
function decodeCursor(cursor: string): Timestamp {
  return Timestamp.fromMillis(Number(cursor));
}

export const firebaseActivitiesService: ActivitiesService = {
  async get(uid, activityId) {
    const snapshot = await getDoc(doc(activitiesCollection(uid), activityId));
    return snapshot.exists() ? toActivityModel(snapshot.id, snapshot.data()) : null;
  },

  subscribe(uid, onActivities, onError) {
    const liveQuery = query(
      activitiesCollection(uid),
      orderBy('startedAt', 'desc'),
      limit(LiveLimit),
    );

    return onSnapshot(
      liveQuery,
      snapshot => {
        onActivities(
          snapshot.docs
            .map(document => toActivityModel(document.id, document.data()))
            .filter((activity): activity is ActivityModel => activity !== null),
        );
      },
      onError,
    );
  },

  subscribeRange(uid, window, onActivities, onError) {
    // `startedAt` is a timestamp, so the window is built from the local midnights
    // either end of the span. The range and the ordering are on the same field,
    // so no composite index is needed.
    const rangeQuery = query(
      activitiesCollection(uid),
      where('startedAt', '>=', Timestamp.fromDate(fromDateKey(window.from))),
      where('startedAt', '<', Timestamp.fromDate(addDays(fromDateKey(window.to), 1))),
      orderBy('startedAt', 'desc'),
    );

    return onSnapshot(
      rangeQuery,
      snapshot => {
        onActivities(
          snapshot.docs
            .map(document => toActivityModel(document.id, document.data()))
            .filter((activity): activity is ActivityModel => activity !== null),
        );
      },
      onError,
    );
  },

  async list(uid, cursor, pageSize) {
    const pageQuery = query(
      activitiesCollection(uid),
      orderBy('startedAt', 'desc'),
      ...(cursor !== null ? [startAfter(decodeCursor(cursor))] : []),
      limit(pageSize),
    );

    const snapshot = await getDocs(pageQuery);

    const items = snapshot.docs
      .map(document => toActivityModel(document.id, document.data()))
      .filter((activity): activity is ActivityModel => activity !== null);

    // A short page means the end. The cursor comes from the last *document*
    // rather than the last kept model, so a rejected document at the boundary
    // cannot make paging stall on the same page forever.
    const last = snapshot.docs.at(-1);
    const lastStartedAt = last ? readDate(last.data()?.startedAt) : undefined;
    const atEnd = snapshot.docs.length < pageSize || !lastStartedAt;

    return {
      items,
      cursor: atEnd ? null : String(lastStartedAt.getTime()),
    };
  },
};
