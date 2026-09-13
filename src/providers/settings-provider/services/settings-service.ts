/**
 * The settings seam: types and the interface only.
 *
 * "Settings" here means everything the profile screen lets an athlete change
 * after setup — the threshold figures their zones are built from, the
 * preferences that shape a plan, and the state of each connected service.
 *
 * The three differ in how real they are, and the interface deliberately does
 * not hide that:
 *
 * - **Metrics** are server-backed (`/v1/profile/metrics`) and survive a
 *   reinstall.
 * - **Preferences** have no column yet. Pool size and the per-discipline
 *   training days are held by whichever implementation is wired in, so the
 *   screens can be built and reviewed before the schema catches up.
 * - **Integrations** and **subscription** describe services this repo has no
 *   backend for at all. They are modelled in full so the screens are real, and
 *   every mutating call is a no-op that resolves.
 *
 * Implementations live alongside this file. Nothing here imports a vendor SDK.
 */

/** Weekday indices, 0 = Sunday, matching `Date.prototype.getDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The threshold figures. Every one is nullable because "not set" is a real
 * state the profile screen shows, and the pace pickers can clear back to it.
 */
export type AthleteMetrics = {
  heartRateMin: number | null;
  heartRateMax: number | null;
  cyclingFtp: number | null;
  runPaceSecondsPerKm: number | null;
  swimPaceSecondsPer100m: number | null;
};

/**
 * A patch over the figures.
 *
 * A key set to `null` clears that figure; a key left out leaves it as it is.
 * The distinction matters — editing FTP must not blank the heart-rate range
 * beside it — and it is carried all the way to the SQL.
 */
export type MetricsChanges = Partial<AthleteMetrics>;

export const POOL_SIZES = ['20m', '25m', '30m', '33m', '50m'] as const;
export type PoolSize = (typeof POOL_SIZES)[number];

export type Preferences = {
  poolSize: PoolSize;
  /** Days a workout may be scheduled at all. Everything below is a subset. */
  availableDays: Weekday[];
  swimDays: Weekday[];
  cycleDays: Weekday[];
  runDays: Weekday[];
  /** At most one each; null when the athlete has no preference. */
  longRideDay: Weekday | null;
  longRunDay: Weekday | null;
  /** Kept to a single workout where the plan can manage it. */
  oneWorkoutDays: Weekday[];
};

/** What Garmin should be told to target for each discipline. */
export type CyclingMetric = 'watts' | 'heartRate';
export type RunningMetric = 'pace' | 'heartRate';

export type Integrations = {
  garmin: {
    connected: boolean;
    /** Push each week's planned workouts to the Garmin calendar. */
    autoSend: boolean;
    cyclingMetric: CyclingMetric;
    runningMetric: RunningMetric;
  };
  strava: {
    connected: boolean;
    /** Rewrite linked Strava activities with the planned workout's name. */
    renameActivities: boolean;
    athleteName: string | null;
    athleteHandle: string | null;
  };
  calendar: {
    connected: boolean;
    lastSyncedAt: Date | null;
    /** The private ICS feed, for calendars that subscribe by URL. */
    feedUrl: string | null;
  };
};

export type IntegrationChanges = {
  [K in keyof Integrations]?: Partial<Integrations[K]>;
};

export type Subscription = {
  /** True once a paid subscription is active, rather than a trial. */
  active: boolean;
  trialEndsAt: Date | null;
};

export interface SettingsService {
  readMetrics(uid: string): Promise<AthleteMetrics>;
  updateMetrics(uid: string, changes: MetricsChanges): Promise<AthleteMetrics>;

  readPreferences(uid: string): Promise<Preferences>;
  updatePreferences(uid: string, changes: Partial<Preferences>): Promise<Preferences>;

  readIntegrations(uid: string): Promise<Integrations>;
  updateIntegrations(uid: string, changes: IntegrationChanges): Promise<Integrations>;

  readSubscription(uid: string): Promise<Subscription>;
  /**
   * Resolves once the code is accepted. Rejects with a message fit to show when
   * it is not — which is the only way this can fail that a screen cares about.
   */
  redeemCode(uid: string, code: string): Promise<void>;
}
