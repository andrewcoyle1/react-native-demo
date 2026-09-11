/**
 * Firestore implementation of `SessionsService`, over `users/{uid}/sessions`.
 *
 * The collection path, the window query and the document shape all live here, so
 * nothing above this file composes a query or knows a field name.
 */
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import type {
  SegmentModel,
  SessionModel,
  SessionTargets,
  SessionsService,
} from './sessions-service';

import { DISCIPLINES, PURPOSES, ZONES } from '@/domain/training';
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
