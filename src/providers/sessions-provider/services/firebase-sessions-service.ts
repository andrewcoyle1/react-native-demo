/**
 * Firestore implementation of `SessionsService`, over `users/{uid}/sessions`.
 *
 * The collection path, the window query and the document shape all live here, so
 * nothing above this file composes a query or knows a field name.
 */
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import type {
  ChartBand,
  SegmentModel,
  SessionConnection,
  SessionModel,
  SessionTargets,
  SessionsService,
  StepRest,
  WorkoutSet,
  WorkoutStep,
} from './sessions-service';

import {
  CONNECTION_KINDS,
  DISCIPLINES,
  INTENSITIES,
  PURPOSES,
  SET_KINDS,
  STEP_ZONES,
  ZONES,
} from '@/domain/training';
import {
  readArray,
  readBoolean,
  readDate,
  readDateKey,
  readEnum,
  readMap,
  readNumber,
  readString,
  readStringArray,
  type RawData,
} from '@/providers/shared/firestore';

function sessionsCollection(uid: string) {
  return collection(getFirestore(), 'users', uid, 'sessions');
}

function toSegment(data: RawData): SegmentModel | null {
  const startSeconds = readNumber(data?.startSeconds);
  const durationSeconds = readNumber(data?.durationSeconds);
  const zone = readEnum(data?.zone, ZONES);

  // A segment without a position or a length cannot be drawn at all, so it is
  // dropped rather than defaulted onto the start of the chart.
  if (startSeconds === undefined || durationSeconds === undefined || zone === undefined) {
    return null;
  }

  return {
    startSeconds,
    durationSeconds,
    zone,
    intensity: readNumber(data?.intensity) ?? 0.5,
    drill: readBoolean(data?.drill) ?? false,
  };
}

function toBand(data: RawData): ChartBand | null {
  const kind = readEnum(data?.kind, SET_KINDS);
  const startSeconds = readNumber(data?.startSeconds);
  const durationSeconds = readNumber(data?.durationSeconds);

  return kind === undefined || startSeconds === undefined || durationSeconds === undefined
    ? null
    : { kind, startSeconds, durationSeconds };
}

/** Absent reads as no rest at all, which is different from an open one. */
function toRest(data: RawData): StepRest | null {
  const seconds = readNumber(data?.seconds);
  const open = readBoolean(data?.open) ?? false;
  return seconds === undefined && !open ? null : { seconds: seconds ?? null, open };
}

/**
 * Recursive, and deliberately tolerant: a step that cannot be read is dropped
 * rather than failing the set around it, because a workout missing one line is
 * still a workout the athlete can follow.
 */
function toStep(data: RawData): WorkoutStep | null {
  if (readString(data?.kind) === 'repeat') {
    const times = readNumber(data?.times);
    if (times === undefined) {
      return null;
    }
    return {
      kind: 'repeat',
      times,
      children: readArray(data?.children, toStep),
      rest: toRest(readMap(data?.rest)),
    };
  }

  const name = readString(data?.name);
  if (name === undefined) {
    return null;
  }

  return {
    kind: 'effort',
    distanceMetres: readNumber(data?.distanceMetres) ?? null,
    durationSeconds: readNumber(data?.durationSeconds) ?? null,
    name,
    zone: readEnum(data?.zone, STEP_ZONES) ?? null,
    equipment: readStringArray(data?.equipment),
    hasVideo: readBoolean(data?.hasVideo) ?? false,
    note: readString(data?.note) ?? null,
    rest: toRest(readMap(data?.rest)),
    parts: readArray(data?.parts, toStep),
  };
}

function toSet(data: RawData): WorkoutSet | null {
  const kind = readEnum(data?.kind, SET_KINDS);
  if (kind === undefined) {
    return null;
  }
  return {
    id: readString(data?.id) ?? kind,
    kind,
    title: readString(data?.title) ?? null,
    steps: readArray(data?.steps, toStep),
  };
}

function toConnection(data: RawData): SessionConnection | null {
  const kind = readEnum(data?.kind, CONNECTION_KINDS);
  return kind === undefined ? null : { kind, syncedAt: readDate(data?.syncedAt) ?? null };
}

/** Every field is optional, so this cannot fail — only come back empty. */
function toTargets(data: RawData): SessionTargets {
  return {
    durationSeconds: readNumber(data?.durationSeconds),
    distanceMetres: readNumber(data?.distanceMetres),
    paceSecondsPerKm: readNumber(data?.paceSecondsPerKm),
    load: readNumber(data?.load),
    estimated: readBoolean(data?.estimated),
  };
}

/**
 * Converts a document into the model, or null when it cannot be one.
 *
 * The bar is deliberately low — a date, a title and a discipline — because those
 * three are what the card cannot render without. Everything else has a sensible
 * empty form, and a session with no chart is a legitimate session.
 */
function toSessionModel(id: string, data: RawData): SessionModel | null {
  const date = readDateKey(data?.date);
  const title = readString(data?.title);
  const discipline = readEnum(data?.discipline, DISCIPLINES);

  if (date === undefined || title === undefined || discipline === undefined) {
    return null;
  }

  const completionData = readMap(data?.completion);
  const completedAt = readDate(completionData?.completedAt);

  return {
    id,
    date,
    title,
    discipline,
    order: readNumber(data?.order) ?? 0,
    purpose: readEnum(data?.purpose, PURPOSES) ?? null,
    focus: readStringArray(data?.focus),
    equipment: readStringArray(data?.equipment),
    descriptor: readString(data?.descriptor) ?? null,
    targets: toTargets(readMap(data?.targets)),
    segments: readArray(data?.segments, toSegment),
    chartSeconds: readNumber(data?.chartSeconds) ?? null,
    tickEveryMinutes: readNumber(data?.tickEveryMinutes) ?? null,
    bands: readArray(data?.bands, toBand),
    sets: readArray(data?.sets, toSet),
    intensity: readEnum(data?.intensity, INTENSITIES) ?? null,
    estimateBasis: readString(data?.estimateBasis) ?? null,
    connections: readArray(data?.connections, toConnection),
    // A completion without a timestamp is treated as no completion: the card
    // would otherwise show a "Completed" capsule it cannot date.
    completion: completedAt
      ? { completedAt, activityId: readString(completionData?.activityId) ?? null }
      : null,
    coachName: readString(data?.coachName) ?? null,
    coachNote: readString(data?.coachNote) ?? null,
  };
}

export const firebaseSessionsService: SessionsService = {
  async get(uid, sessionId) {
    const snapshot = await getDoc(doc(sessionsCollection(uid), sessionId));
    return snapshot.exists() ? toSessionModel(snapshot.id, snapshot.data()) : null;
  },

  subscribe(uid, window, onSessions, onError) {
    // `date` is a 'YYYY-MM-DD' string, so the window is a plain range query
    // covered by the single-field index Firestore creates automatically.
    //
    // Ordering stops at `date`: a second `orderBy('order')` would demand a
    // composite index for a tie-break among the two or three sessions that share
    // a day, so the within-day sort happens below instead.
    const sessionsQuery = query(
      sessionsCollection(uid),
      where('date', '>=', window.from),
      where('date', '<=', window.to),
      orderBy('date'),
    );

    return onSnapshot(
      sessionsQuery,
      snapshot => {
        const sessions = snapshot.docs
          .map(document => toSessionModel(document.id, document.data()))
          .filter((session): session is SessionModel => session !== null);

        sessions.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));
        onSessions(sessions);
      },
      onError,
    );
  },

  async markComplete(uid, sessionId, completion) {
    await updateDoc(doc(sessionsCollection(uid), sessionId), {
      completion: completion
        ? {
            // The client's clock is not trusted for the stamp itself; the rules
            // pin it to request.time.
            completedAt: serverTimestamp(),
            activityId: completion.activityId,
          }
        : null,
    });
  },
};
