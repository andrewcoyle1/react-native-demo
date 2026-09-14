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
import type {
  ActivityProvider,
  ActivitySource,
  DateRange,
  Discipline,
} from '@/domain/training';
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
  /** Total ascent. */
  elevationMetres?: number;
  /** Steps or pedal strokes per minute. */
  averageCadence?: number;
};

/**
 * One lap, as the watch recorded it. The detail sheet charts these as bars.
 *
 * Auto-laps are usually every kilometre, so `distanceMetres` is near-constant
 * and `durationSeconds` is what varies — but a manual lap can be any length, so
 * both are carried rather than one being derived.
 */
export type LapModel = {
  /** 1-based, in the order they were recorded. */
  index: number;
  distanceMetres: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
};

/**
 * One sample of the recorded streams.
 *
 * Keyed by distance rather than time because the charts are drawn against
 * distance — the axis reads 1km, 2km, 3km. Every measure is optional: a watch
 * without a strap records pace and cadence but no heart rate.
 */
export type StreamSample = {
  atMetres: number;
  paceSecondsPerKm?: number;
  heartRate?: number;
  cadence?: number;
};

/** The athlete's own verdict, recorded after the session. */
export type ActivityReview = {
  /** Rate of perceived exertion, 1-10. */
  rpe: number;
  note: string | null;
};

/** Where this activity can also be viewed. */
export type ActivityLink = {
  provider: ActivityProvider;
  url: string;
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
  /**
   * The detail-only fields below are empty on a listed activity and filled by
   * `get`. The list shows dozens of rows at a time, and a stream is hundreds of
   * samples: sending them to build a row would cost far more than the row is
   * worth. A reader that needs them asks for the one activity it is showing.
   */
  laps: LapModel[];
  samples: StreamSample[];
  review: ActivityReview | null;
  links: ActivityLink[];
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

  /**
   * One activity by id, with the detail fields the list omits.
   *
   * Resolves to null when there is no such activity — a session can name an
   * activity that has since been deleted upstream, and the sheet has to show
   * the planned side rather than fail.
   */
  get(uid: string, activityId: string): Promise<ActivityModel | null>;
}
