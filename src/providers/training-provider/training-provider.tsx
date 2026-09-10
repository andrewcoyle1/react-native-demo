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
import { createContext, useCallback, useContext, useMemo } from 'react';
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
import { useRemoteSubscription, type RemoteState, type Subscribe } from '@/providers/shared/remote-state';

type TrainingContextValue = {
  plans: RemoteState<PlanModel[]>;
  races: RemoteState<RaceModel[]>;
  /** Null data means the athlete has not set a schedule up yet. */
  schedule: RemoteState<ScheduleModel | null>;
  /** Resolves the race a plan builds towards, or null when there is none. */
  raceFor: (plan: PlanModel) => RaceModel | null;
  updateSchedule: (changes: Partial<ScheduleDraft>) => Promise<void>;
};

const TrainingContext = createContext<TrainingContextValue | null>(null);

type TrainingProviderProps = PropsWithChildren<{
  service?: TrainingService;
}>;

const Loading = { status: 'loading' } as const;

export function TrainingProvider({
  children,
  service = firebaseTrainingService,
}: TrainingProviderProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const subscribePlans = useCallback<Subscribe<PlanModel[]>>(
    (key, onData, onError) => service.subscribePlans(key, onData, onError),
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

  const plans = useRemoteSubscription(uid, subscribePlans, 'training: plans') ?? Loading;
  const races = useRemoteSubscription(uid, subscribeRaces, 'training: races') ?? Loading;
  const schedule = useRemoteSubscription(uid, subscribeSchedule, 'training: schedule') ?? Loading;

  const updateSchedule = useCallback(
    async (changes: Partial<ScheduleDraft>) => {
      if (uid) {
        await service.updateSchedule(uid, changes);
      }
    },
    [uid, service],
  );

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
    };
  }, [plans, races, schedule, updateSchedule]);

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}

export function useTraining() {
  const value = useContext(TrainingContext);
  if (!value) {
    throw new Error('useTraining must be used inside <TrainingProvider>');
  }
  return value;
}
