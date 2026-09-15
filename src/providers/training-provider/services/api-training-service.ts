/**
 * `TrainingService` over the Stamina API.
 *
 * Plans and races are read-only, which is not enforced here but on the server:
 * there is no route that writes one. The schedule is the athlete's, and is the
 * only thing this service sends.
 */
import type {
  PlanModel,
  RaceModel,
  ScheduleDraft,
  ScheduleModel,
  TrainingService,
} from './training-service';

import { toDateKey } from '@/domain/training';
import type { PlanDTO, RaceDTO, ScheduleDTO } from '@/domain/wire.ts';
import { ApiError, api } from '@/services/api/client';

/**
 * The DTOs and the models are the same shape here, so these are identity
 * mappings — but they stay, because the wire type is the server's to change and
 * the model is the app's. Collapsing them would couple a screen to a payload.
 */
const toPlan = (dto: PlanDTO): PlanModel => ({ ...dto });
const toRace = (dto: RaceDTO): RaceModel => ({ ...dto });

const toSchedule = (dto: ScheduleDTO): ScheduleModel => ({
  availableMinutes: dto.availableMinutes,
  commitments: dto.commitments,
  modifiedAt: dto.modifiedAt ? new Date(dto.modifiedAt) : null,
});

/**
 * One fetch, delivered once, cancellable.
 *
 * The stream shape is kept deliberately: `onData` may fire many times, so this
 * becomes a real subscription without anything above it changing.
 */
function fetchOnce<T>(
  path: string,
  map: (payload: never) => T,
  onData: (value: T) => void,
  onError: (error: Error) => void,
  options: { missingIs?: T } = {},
): () => void {
  const controller = new AbortController();

  api
    .get<never>(path, { signal: controller.signal })
    .then(payload => onData(map(payload)))
    .catch((error: unknown) => {
      if (controller.signal.aborted) {
        return;
      }
      // Some documents legitimately do not exist yet — a schedule the athlete
      // has not set. That is a value, not a failure.
      if (error instanceof ApiError && error.status === 404 && options.missingIs !== undefined) {
        onData(options.missingIs);
        return;
      }
      onError(error instanceof Error ? error : new Error('Could not load your training.'));
    });

  return () => controller.abort();
}

export const apiTrainingService: TrainingService = {
  subscribePlans(_uid, onPlans, onError) {
    return fetchOnce<PlanModel[]>(
      '/v1/plans',
      (dtos: never) => (dtos as PlanDTO[]).map(toPlan),
      onPlans,
      onError,
    );
  },

  subscribeRaces(_uid, onRaces, onError) {
    return fetchOnce<RaceModel[]>(
      '/v1/races',
      (dtos: never) => (dtos as RaceDTO[]).map(toRace),
      onRaces,
      onError,
    );
  },

  subscribeSchedule(_uid, onSchedule, onError) {
    return fetchOnce<ScheduleModel | null>(
      '/v1/schedule',
      (dto: never) => toSchedule(dto as ScheduleDTO),
      onSchedule,
      onError,
      { missingIs: null },
    );
  },

  async updateSchedule(_uid, changes: Partial<ScheduleDraft>) {
    await api.put<ScheduleDTO>('/v1/schedule', {
      ...(changes.availableMinutes !== undefined
        ? { availableMinutes: changes.availableMinutes }
        : {}),
      ...(changes.commitments !== undefined
        ? {
            // Ids are the server's: it is sent the set that should exist and
            // returns whatever now does.
            commitments: changes.commitments.map(({ label, weekday, discipline }) => ({
              label,
              weekday,
              discipline,
            })),
          }
        : {}),
    });
  },

  async resetPlans() {
    await api.delete('/v1/plans');
  },

  async createPlan(_uid, race) {
    await api.post<PlanDTO>('/v1/plans', {
      // The one field JSON cannot carry: a race date is a calendar day, and
      // `toISOString` would move an evening race in Dublin to the next day.
      race: race ? { ...race, date: toDateKey(race.date) } : null,
    });
  },
};
