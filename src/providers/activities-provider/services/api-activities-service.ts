/**
 * `ActivitiesService` over the Stamina API.
 *
 * The only service implementing three reads, because the app asks three
 * different questions of this collection: the most recent few, one week's
 * worth, and a walk backwards through everything.
 *
 * The cursor is opaque here by design. It happens to be `<millis>:<uuid>`
 * today; this file passes back whatever it was handed and parses none of it,
 * so the server can change that encoding freely.
 */
import type { ActivitiesService, ActivityModel, RoutePointModel } from './activities-service';

import type { ActivityDTO } from '@/domain/wire.ts';
import { api } from '@/services/api/client';
import type { Page } from '@/providers/shared/paged-state';

/** How many recent activities the freshness read holds. */
const RECENT_LIMIT = 20;

function toActivity(dto: ActivityDTO): ActivityModel {
  return {
    id: dto.id,
    startedAt: new Date(dto.startedAt),
    title: dto.title,
    discipline: dto.discipline,
    place: dto.place,
    route: dto.route as RoutePointModel[],
    sources: dto.sources,
    stats: dto.stats,
    sessionId: dto.sessionId,
  };
}

/** One fetch, delivered once, cancellable on teardown. */
function fetchOnce(
  path: string,
  onData: (activities: ActivityModel[]) => void,
  onError: (error: Error) => void,
  unwrap: (payload: never) => ActivityDTO[],
): () => void {
  const controller = new AbortController();

  api
    .get<never>(path, { signal: controller.signal })
    .then(payload => onData(unwrap(payload).map(toActivity)))
    .catch((error: unknown) => {
      if (controller.signal.aborted) {
        return;
      }
      onError(error instanceof Error ? error : new Error('Could not load your activities.'));
    });

  return () => controller.abort();
}

export const apiActivitiesService: ActivitiesService = {
  subscribe(_uid, onActivities, onError) {
    return fetchOnce(
      `/v1/activities?limit=${RECENT_LIMIT}`,
      onActivities,
      onError,
      (page: never) => (page as Page<ActivityDTO>).items,
    );
  },

  subscribeRange(_uid, window, onActivities, onError) {
    // The windowed form returns a plain array: it is bounded already, so there
    // is no cursor and no envelope to unwrap.
    return fetchOnce(
      `/v1/activities?from=${window.from}&to=${window.to}`,
      onActivities,
      onError,
      (activities: never) => activities as ActivityDTO[],
    );
  },

  async list(_uid, cursor, pageSize) {
    const query = new URLSearchParams({ limit: String(pageSize) });
    if (cursor) {
      query.set('cursor', cursor);
    }

    const page = await api.get<Page<ActivityDTO>>(`/v1/activities?${query.toString()}`);

    return { items: page.items.map(toActivity), cursor: page.cursor };
  },
};
