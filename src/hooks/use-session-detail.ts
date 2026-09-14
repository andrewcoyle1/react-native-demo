/**
 * Everything the workout detail sheet shows, and nothing about how it looks.
 *
 * The sheet is a root-level route, so it opens *above* `SessionsProvider` and
 * `ActivityWindowProvider` and cannot read whichever window they happen to hold
 * — hence the reads by id here rather than a lookup in existing state. It also
 * means the sheet is reachable from anywhere: the dashboard, the plan, or a
 * deep link, without any of them arranging a provider first.
 *
 * The screen consumes this and renders; every branch below is a decision about
 * the session rather than about the layout, which is what makes the sheet's
 * logic — which tab opens, what happens when the activity is missing, what
 * uncompleting does — testable without a renderer.
 */
import { useCallback, useState } from 'react';

import type { UnitSystem } from '@/domain/training';
import type { ActivityModel } from '@/providers/activities-provider';
import { useAuth } from '@/providers/auth-provider';
import { useServices } from '@/providers/services-provider';
import { useRemoteSubscription, type Subscribe } from '@/providers/shared/remote-state';
import type { SessionModel } from '@/providers/sessions-provider';
import { useUser } from '@/providers/user-provider';
import { reportError } from '@/services/telemetry';

export type SessionDetailTab = 'planned' | 'completed';

/** The session and, when it has been done, the activity that did it. */
type Detail = { session: SessionModel; activity: ActivityModel | null };

export type SessionDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'missing' }
  | { status: 'ready'; session: SessionModel; activity: ActivityModel | null };

export type SessionDetail = {
  state: SessionDetailState;
  units: UnitSystem;
  tab: SessionDetailTab;
  setTab: (tab: SessionDetailTab) => void;
  /** False until there is a recorded activity to show on the other tab. */
  hasCompleted: boolean;
  /** Clears the completion, which sends the athlete back to the planned tab. */
  uncomplete: () => Promise<void>;
  busy: boolean;
};

export function useSessionDetail(sessionId: string): SessionDetail {
  const { user } = useAuth();
  const services = useServices();
  const { state: profile } = useUser();

  /*
   * Overrides the fetched detail once the athlete has uncompleted the session.
   * Held separately rather than by re-fetching: the write is the source of
   * truth, and a round trip would leave the sheet showing a completed session
   * for as long as the network took.
   */
  const [uncompleted, setUncompleted] = useState(false);
  const [chosenTab, setChosenTab] = useState<SessionDetailTab | null>(null);
  const [busy, setBusy] = useState(false);

  const uid = user?.uid ?? null;
  const units: UnitSystem = profile.status === 'ready' ? profile.user.units : 'metric';

  /*
   * A one-shot read wearing the shape of a subscription, which is what lets it
   * reuse the repo's own read idiom rather than hand-rolling loading and error
   * state around an effect. It delivers once and cancels by ignoring whatever
   * arrives after teardown — there is no listener to close.
   */
  const subscribe = useCallback<Subscribe<Detail | null>>(
    (_key, onData, onError) => {
      let live = true;

      void (async () => {
        try {
          const session = await services.sessions.get(uid!, sessionId);
          if (!session) {
            // Null rather than an error: a session removed from the plan is a
            // fact about the plan, not a failure to read it.
            if (live) onData(null);
            return;
          }

          /*
           * Fetched only when the session names one, and a failure to find it
           * is not a failure of the sheet: an activity can be deleted upstream
           * while the session still points at it, and the planned side is
           * still worth showing.
           */
          const activityId = session.completion?.activityId ?? null;
          const activity = activityId ? await services.activities.get(uid!, activityId) : null;

          if (live) onData({ session, activity });
        } catch (caught) {
          if (live) {
            onError(caught instanceof Error ? caught : new Error('Could not load this session.'));
          }
        }
      })();

      return () => {
        live = false;
      };
    },
    [uid, sessionId, services],
  );

  const remote = useRemoteSubscription(
    uid ? `${uid}:${sessionId}` : null,
    subscribe,
    'session detail: load',
  );

  const state = toState(remote, uncompleted);

  /*
   * A session already done opens on what the athlete did, not on what was asked
   * of them — until they choose otherwise, which `chosenTab` then remembers.
   */
  const hasCompleted = state.status === 'ready' && state.activity !== null;
  const tab: SessionDetailTab = chosenTab ?? (hasCompleted ? 'completed' : 'planned');

  const uncomplete = useCallback(async () => {
    if (!uid) {
      return;
    }

    setBusy(true);
    try {
      await services.sessions.markComplete(uid, sessionId, null);
      setUncompleted(true);
      setChosenTab('planned');
    } catch (caught) {
      reportError(caught, 'session detail: uncomplete');
    } finally {
      setBusy(false);
    }
  }, [uid, sessionId, services]);

  return { state, units, tab, setTab: setChosenTab, hasCompleted, uncomplete, busy };
}

/** Folds the read's own states together with the local uncompleted override. */
function toState(
  remote: ReturnType<typeof useRemoteSubscription<Detail | null>>,
  uncompleted: boolean,
): SessionDetailState {
  if (remote === null || remote.status === 'loading') {
    return { status: 'loading' };
  }
  if (remote.status === 'error') {
    return { status: 'error' };
  }
  if (remote.data === null) {
    return { status: 'missing' };
  }

  const { session, activity } = remote.data;

  return uncompleted
    ? { status: 'ready', session: { ...session, completion: null }, activity: null }
    : { status: 'ready', session, activity };
}
