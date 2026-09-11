/**
 * Activities within a fixed span of days.
 *
 * The sibling of `ActivitiesProvider`: same service, the other read. Where that
 * one pages backwards through the whole history for the Activities tab, this
 * holds a live listener over one week for the Plan tab, which needs the recorded
 * work for whichever week is on screen — including weeks far enough back that
 * paging to them would be absurd.
 *
 * Deliberately a second provider rather than an option on the first: a consumer
 * wants one shape or the other, never both, and a single provider trying to be
 * both would make `items` mean different things depending on a prop.
 */
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { firebaseActivitiesService } from './services/firebase-activities-service';
import type { ActivitiesService, ActivityModel } from './services/activities-service';

import type { DateRange } from '@/domain/training';
import { useAuth } from '@/providers/auth-provider';
import { useRemoteSubscription, type RemoteState, type Subscribe } from '@/providers/shared/remote-state';

type ActivityWindowContextValue = {
  state: RemoteState<ActivityModel[]>;
  window: DateRange;
};

const ActivityWindowContext = createContext<ActivityWindowContextValue | null>(null);

type ActivityWindowProviderProps = PropsWithChildren<{
  /** The span of days to read. Inclusive at both ends. */
  window: DateRange;
  service?: ActivitiesService;
}>;

export function ActivityWindowProvider({
  children,
  window,
  service = firebaseActivitiesService,
}: ActivityWindowProviderProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const { from, to } = window;

  // The window is in the key, not just the closure: a new span must resubscribe.
  const key = uid ? `${uid}|${from}|${to}` : null;

  const subscribe = useCallback<Subscribe<ActivityModel[]>>(
    (_key, onData, onError) => {
      if (!uid) {
        return () => {};
      }
      return service.subscribeRange(uid, { from, to }, onData, onError);
    },
    [uid, service, from, to],
  );

  const remote = useRemoteSubscription(key, subscribe, 'activities: window');

  const state = useMemo<RemoteState<ActivityModel[]>>(
    () => remote ?? { status: 'loading' },
    [remote],
  );

  const value = useMemo<ActivityWindowContextValue>(
    () => ({ state, window: { from, to } }),
    [state, from, to],
  );

  return (
    <ActivityWindowContext.Provider value={value}>{children}</ActivityWindowContext.Provider>
  );
}

export function useActivityWindow() {
  const value = useContext(ActivityWindowContext);
  if (!value) {
    throw new Error('useActivityWindow must be used inside <ActivityWindowProvider>');
  }
  return value;
}
