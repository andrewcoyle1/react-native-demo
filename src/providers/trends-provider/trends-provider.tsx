/**
 * Trends provider.
 *
 * Takes its window as a prop like `SessionsProvider` does, and caches it: the
 * figures change slowly, so showing yesterday's while today's is fetched is
 * strictly better than showing a spinner.
 */
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { firebaseTrendsService } from './services/firebase-trends-service';
import type { TrendsModel, TrendsService } from './services/trends-service';

import type { DateRange } from '@/domain/training';
import { useAuth } from '@/providers/auth-provider';
import type { Subscribe } from '@/providers/shared/remote-state';
import { useSyncedSubscription, type SyncState } from '@/providers/shared/sync-state';

type TrendsContextValue = { state: SyncState<TrendsModel> };

const TrendsContext = createContext<TrendsContextValue | null>(null);

type TrendsProviderProps = PropsWithChildren<{
  window: DateRange;
  service?: TrendsService;
}>;

const Loading = { status: 'loading' } as const;

export function TrendsProvider({
  children,
  window,
  service = firebaseTrendsService,
}: TrendsProviderProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const { from, to } = window;
  const key = uid ? `${uid}|${from}|${to}` : null;

  const subscribe = useCallback<Subscribe<TrendsModel>>(
    (_key, onData, onError) => {
      if (!uid) {
        return () => {};
      }
      return service.subscribe(uid, { from, to }, onData, onError);
    },
    [uid, service, from, to],
  );

  const remote = useSyncedSubscription(key, subscribe, {
    context: 'trends: subscription',
    // Numbers only, so nothing needs reviving.
    cache: { name: 'trends', revive: raw => raw as TrendsModel },
  });

  const state = useMemo<SyncState<TrendsModel>>(() => remote ?? Loading, [remote]);
  const value = useMemo<TrendsContextValue>(() => ({ state }), [state]);

  return <TrendsContext.Provider value={value}>{children}</TrendsContext.Provider>;
}

export function useTrends() {
  const value = useContext(TrendsContext);
  if (!value) {
    throw new Error('useTrends must be used inside <TrendsProvider>');
  }
  return value;
}
