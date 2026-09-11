/** `TrendsService` over the Stamina API. */
import type { TrendsService } from './trends-service';

import type { TrendsDTO } from '@/domain/wire.ts';
import { api } from '@/services/api/client';

export const apiTrendsService: TrendsService = {
  subscribe(_uid, window, onTrends, onError) {
    const controller = new AbortController();

    api
      .get<TrendsDTO>(`/v1/trends?from=${window.from}&to=${window.to}`, {
        signal: controller.signal,
      })
      .then(dto =>
        onTrends({
          planned: dto.planned,
          completed: dto.completed,
          fitness: dto.fitness,
          fatigue: dto.fatigue,
          form: dto.form,
        }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        onError(error instanceof Error ? error : new Error('Could not load your trends.'));
      });

    return () => controller.abort();
  },
};
