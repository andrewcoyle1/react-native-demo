/**
 * Training provider — plans, goal races and the athlete's schedule.
 *
 * Three subscriptions behind one context, because every screen that wants a plan
 * also wants the race it builds towards. Keeping them together means the plan
 * card resolves its race without a second provider or a second round of loading
 * states.
 *
 * Mounted inside `(main)`, so a uid is guaranteed and there is no `signedOut`.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { firebaseTrainingService } from './services/firebase-training-service';
import type {
  PlanModel,
  RaceModel,
  ScheduleDraft,
  ScheduleModel,
  TrainingService,
} from './services/training-service';

import { useAuth } from '@/providers/auth-provider';
import type { Subscribe } from '@/providers/shared/remote-state';
import { useSyncedSubscription, type SyncState } from '@/providers/shared/sync-state';

type TrainingContextValue = {
  /*
   * `SyncState` rather than `RemoteState`: it is the same union with `stale` on
   * the ready branch, so a screen can say whether it is showing a cached copy.
   * Consumers that ignore it are unaffected.
   */
  plans: SyncState<PlanModel[]>;
  races: SyncState<RaceModel[]>;
  /** Null data means the athlete has not set a schedule up yet. */
  schedule: SyncState<ScheduleModel | null>;
  /** Resolves the race a plan builds towards, or null when there is none. */
  raceFor: (plan: PlanModel) => RaceModel | null;
  updateSchedule: (changes: Partial<ScheduleDraft>) => Promise<void>;
  /** Deletes every plan, then re-subscribes so `plans` reflects it. */
  resetPlans: () => Promise<void>;
};

const TrainingContext = createContext<TrainingContextValue | null>(null);

type TrainingProviderProps = PropsWithChildren<{
  service?: TrainingService;
}>;

const Loading = { status: 'loading' } as const;

/** `modifiedAt` is a Date, which JSON stored as a string. */
function reviveSchedule(raw: unknown): ScheduleModel | null {
  if (raw === null) {
    return null;
  }
  const stored = raw as Omit<ScheduleModel, 'modifiedAt'> & { modifiedAt: string | null };
  return { ...stored, modifiedAt: stored.modifiedAt ? new Date(stored.modifiedAt) : null };
}

export function TrainingProvider({
  children,
  service = firebaseTrainingService,
}: TrainingProviderProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  /*
   * Bumped after a reset so the plans key changes and `useSyncedSubscription`
   * restarts its effect. Firestore's own `onSnapshot` would notice a batch
   * delete on its own, and the mock keeps a listener set that does the same —
   * but the API implementation is a one-shot fetch (see `docs/streaming.md`;
   * this app has no live plan stream yet), so nothing re-reads it otherwise.
   */
  const [plansEpoch, setPlansEpoch] = useState(0);
  const plansKey = uid ? `${uid}:${plansEpoch}` : null;

  const subscribePlans = useCallback<Subscribe<PlanModel[]>>(
    (key, onData, onError) => service.subscribePlans(key.split(':')[0]!, onData, onError),
    [service],
  );

  const subscribeRaces = useCallback<Subscribe<RaceModel[]>>(
    (key, onData, onError) => service.subscribeRaces(key, onData, onError),
    [service],
  );

  const subscribeSchedule = useCallback<Subscribe<ScheduleModel | null>>(
    (key, onData, onError) => service.subscribeSchedule(key, onData, onError),
    [service],
  );

  /*
   * Cached so that opening the app shows the plan it showed last time rather
   * than a spinner, and retried with backoff so a read that failed in a tunnel
   * recovers without the athlete doing anything.
   *
   * `revive` rebuilds what JSON cannot carry. Plans and races hold only strings
   * and numbers, so theirs are pass-throughs; the schedule's `modifiedAt` is a
   * Date and has to be rebuilt.
   */
  const plans =
    useSyncedSubscription(plansKey, subscribePlans, {
      context: 'training: plans',
      cache: { name: 'plans', revive: raw => raw as PlanModel[] },
    }) ?? Loading;

  const races =
    useSyncedSubscription(uid, subscribeRaces, {
      context: 'training: races',
      cache: { name: 'races', revive: raw => raw as RaceModel[] },
    }) ?? Loading;

  const schedule =
    useSyncedSubscription(uid, subscribeSchedule, {
      context: 'training: schedule',
      cache: { name: 'schedule', revive: reviveSchedule },
    }) ?? Loading;

  const updateSchedule = useCallback(
    async (changes: Partial<ScheduleDraft>) => {
      if (uid) {
        await service.updateSchedule(uid, changes);
      }
    },
    [uid, service],
  );

  const resetPlans = useCallback(async () => {
    if (uid) {
      await service.resetPlans(uid);
      setPlansEpoch(epoch => epoch + 1);
    }
  }, [uid, service]);

  const value = useMemo<TrainingContextValue>(() => {
    const byId = new Map<string, RaceModel>();
    if (races.status === 'ready') {
      for (const race of races.data) {
        byId.set(race.id, race);
      }
    }

    return {
      plans,
      races,
      schedule,
      raceFor: plan => (plan.raceId ? (byId.get(plan.raceId) ?? null) : null),
      updateSchedule,
      resetPlans,
    };
  }, [plans, races, schedule, updateSchedule, resetPlans]);

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}

export function useTraining() {
  const value = useContext(TrainingContext);
  if (!value) {
    throw new Error('useTraining must be used inside <TrainingProvider>');
  }
  return value;
}
