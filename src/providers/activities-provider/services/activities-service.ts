/**
 * The activities seam: what the athlete actually did.
 *
 * The counterpart to a session. A session is planned and lives in a bounded
 * window; an activity is recorded and accumulates for as long as the athlete
 * trains, so this is the one collection the app pages through rather than
 * subscribing to whole.
 *
 * Both reads are offered on purpose. `subscribe` holds a short live window so a
 * newly synced activity appears without a pull-to-refresh; `list` walks
 * backwards through the history a page at a time.
 */
import type { ActivitySource, DateRange, Discipline } from '@/domain/training';
import type { Page } from '@/providers/shared/paged-state';

/** A point on the route thumbnail, normalised to 0-1 in both axes. */
export type RoutePointModel = { x: number; y: number };

/**
 * Recorded figures. All optional: a gym session has a duration, a heart rate and
 * a calorie count but no distance, while a swim has no heart rate.
 */
export type ActivityStats = {
  distanceMetres?: number;
  durationSeconds?: number;
  /** Seconds per kilometre; rendered as pace or speed by discipline. */
  paceSecondsPerKm?: number;
  averageHeartRate?: number;
  calories?: number;
};

export type ActivityModel = {
  id: string;
  /** When the athlete started. The ordering field, and the paging cursor. */
  startedAt: Date;
  title: string;
  discipline: Discipline;
  place: string | null;
  route: RoutePointModel[];
  /** How it reached the app — the small marks on the row. */
  sources: ActivitySource[];
  stats: ActivityStats;
  /** The planned session this was matched to, when it was matched to one. */
  sessionId: string | null;
};

export interface ActivitiesService {
  /**
   * The most recent activities, live. Capped by the implementation — this is a
   * freshness listener, not a way to read the history.
   */
  subscribe(
    uid: string,
    onActivities: (activities: ActivityModel[]) => void,
    onError: (error: Error) => void,
  ): () => void;

  /**
   * Live activities within a span of days, newest first.
   *
   * The Plan tab's read: it sets one week of recorded work against one week of
   * planned work, and paging backwards through the whole history to find an old
   * week would be both slow and wrong.
   */
  subscribeRange(
    uid: string,
    window: DateRange,
    onActivities: (activities: ActivityModel[]) => void,
    onError: (error: Error) => void,
  ): () => void;

  /**
   * One page of history, newest first.
   *
   * `cursor` is opaque and comes from the previous page; null asks for the
   * first. A page whose cursor comes back null is the last one.
   */
  list(uid: string, cursor: string | null, pageSize: number): Promise<Page<ActivityModel>>;
}
