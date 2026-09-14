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
import type {
  ActivitiesService,
  ActivityModel,
  LapModel,
  RoutePointModel,
} from './activities-service';

import type { ActivityDTO, LapDTO } from '@/domain/wire.ts';
import { api } from '@/services/api/client';
import type { Page } from '@/providers/shared/paged-state';

/** How many recent activities the freshness read holds. */
const RECENT_LIMIT = 20;

/**
 * Pace is derived here rather than carried on the wire: a stored pace that
 * disagreed with the distance and duration beside it would draw a bar that
 * contradicts its own label.
 */
function toLap(dto: LapDTO): LapModel {
  return {
    ...dto,
    paceSecondsPerKm: Math.round((dto.durationSeconds / dto.distanceMetres) * 1000),
  };
}

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
    /* Omitted by the list endpoint, sent by the detail one. Absent reads as
       empty rather than as an error: a listed activity is not a broken one. */
    laps: dto.laps?.map(toLap) ?? [],
    samples: dto.samples ?? [],
    review: dto.review ?? null,
    links: dto.links ?? [],
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
  async get(_uid, activityId) {
    return toActivity(await api.get<ActivityDTO>(`/v1/activities/${activityId}`));
  },

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
