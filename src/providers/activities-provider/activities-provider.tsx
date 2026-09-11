/**
 * Activities provider — the athlete's recorded history.
 *
 * The only slice built on `usePagedCollection` rather than a live subscription,
 * because the collection has no bound. `loadMore` is wired to the list's own
 * end-of-scroll, so the history is read in the order the athlete asks for it.
 */
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { firebaseActivitiesService } from './services/firebase-activities-service';
import type { ActivitiesService, ActivityModel } from './services/activities-service';

import { useAuth } from '@/providers/auth-provider';
import { usePagedCollection, type List, type PagedState } from '@/providers/shared/paged-state';

/** Enough to overflow a phone screen, so the first page never looks short. */
const PageSize = 20;

type ActivitiesContextValue = {
  state: PagedState<ActivityModel>;
  loadMore: () => void;
  refresh: () => void;
};

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

type ActivitiesProviderProps = PropsWithChildren<{
  service?: ActivitiesService;
}>;

const Loading = { status: 'loading' } as const;

export function ActivitiesProvider({
  children,
  service = firebaseActivitiesService,
}: ActivitiesProviderProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const list = useCallback<List<ActivityModel>>(
    (key, cursor) => service.list(key, cursor, PageSize),
    [service],
  );

  const { state, loadMore, refresh } = usePagedCollection(uid, list, 'activities: page');

  const value = useMemo<ActivitiesContextValue>(
    () => ({ state: state ?? Loading, loadMore, refresh }),
    [state, loadMore, refresh],
  );

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>;
}

export function useActivities() {
  const value = useContext(ActivitiesContext);
  if (!value) {
    throw new Error('useActivities must be used inside <ActivitiesProvider>');
  }
  return value;
}
