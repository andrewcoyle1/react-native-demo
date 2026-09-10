/**
 * Sessions provider — the "manager" layer for planned sessions.
 *
 * Takes the window it should read as a prop, so the Dashboard can mount it over
 * a week while the Plan tab mounts it over a month, and the listener follows
 * whichever is on screen. The window is part of the subscription key, so
 * changing it tears the old listener down.
 *
 * No `signedOut` member: this provider only mounts inside `(main)`, which is
 * behind the root layout's auth gate, so a uid is guaranteed.
 */
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { firebaseSessionsService } from './services/firebase-sessions-service';
import type {
  SessionCompletion,
  SessionModel,
  SessionsService,
} from './services/sessions-service';

import type { DateKey, DateRange } from '@/domain/training';
import { useAuth } from '@/providers/auth-provider';
import type { Subscribe } from '@/providers/shared/remote-state';
import { useSyncedSubscription, type SyncState } from '@/providers/shared/sync-state';

type SessionsContextValue = {
  state: SyncState<SessionModel[]>;
  /** The span being read. Consumers that combine other data scope it to this. */
  window: DateRange;
  /** The same sessions grouped by day — every consumer wants them that way. */
  byDate: Map<DateKey, SessionModel[]>;
  markComplete: (sessionId: string, completion: SessionCompletion | null) => Promise<void>;
};

const SessionsContext = createContext<SessionsContextValue | null>(null);

type SessionsProviderProps = PropsWithChildren<{
  /** The span of days to read. Inclusive at both ends. */
  window: DateRange;
  /** Injected dependency. Defaults to the Firestore implementation. */
  service?: SessionsService;
}>;

/** The only Date a session carries; everything else survives JSON intact. */
function reviveSessions(raw: unknown): SessionModel[] {
  return (raw as SessionModel[]).map(session => ({
    ...session,
    completion: session.completion
      ? { ...session.completion, completedAt: new Date(session.completion.completedAt) }
      : null,
  }));
}

export function SessionsProvider({
  children,
  window,
  service = firebaseSessionsService,
}: SessionsProviderProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // Destructured so the memos below depend on the two strings rather than on the
  // identity of a window object the caller may rebuild every render.
  const { from, to } = window;

  // The window is in the key, not just the closure: a new span must resubscribe.
  const key = uid ? `${uid}|${from}|${to}` : null;

  const subscribe = useCallback<Subscribe<SessionModel[]>>(
    (_key, onData, onError) => {
      if (!uid) {
        return () => {};
      }
      return service.subscribe(uid, { from, to }, onData, onError);
    },
    [uid, service, from, to],
  );

  /*
   * Cached per window, so reopening the app at a pool shows this week's
   * sessions rather than a spinner, and a failed read retries on its own.
   * `revive` rebuilds `completion.completedAt`, which JSON stored as a string.
   */
  const remote = useSyncedSubscription(key, subscribe, {
    context: 'sessions: subscription',
    cache: { name: 'sessions', revive: reviveSessions },
  });

  // `remote` is null only with no uid, which cannot happen inside `(main)`.
  // Memoised rather than defaulted inline, so `byDate` is not rebuilt every
  // render by a fresh fallback object.
  const state = useMemo<SyncState<SessionModel[]>>(
    () => remote ?? { status: 'loading' },
    [remote],
  );

  const byDate = useMemo(() => {
    const grouped = new Map<DateKey, SessionModel[]>();
    if (state.status !== 'ready') {
      return grouped;
    }
    for (const session of state.data) {
      const day = grouped.get(session.date);
      if (day) {
        day.push(session);
      } else {
        grouped.set(session.date, [session]);
      }
    }
    return grouped;
  }, [state]);

  const markComplete = useCallback(
    async (sessionId: string, completion: SessionCompletion | null) => {
      if (uid) {
        await service.markComplete(uid, sessionId, completion);
      }
    },
    [uid, service],
  );

  const value = useMemo<SessionsContextValue>(
    () => ({ state, window: { from, to }, byDate, markComplete }),
    [state, from, to, byDate, markComplete],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions() {
  const value = useContext(SessionsContext);
  if (!value) {
    throw new Error('useSessions must be used inside <SessionsProvider>');
  }
  return value;
}
