/**
 * The wire contract.
 *
 * What the API sends and receives, as distinct from what the app holds. The two
 * differ in exactly one systematic way — JSON has no `Date` — and that boundary
 * is where a contract drifts, so it is written down once here and imported by
 * both sides.
 *
 * `server/tsconfig.json` aliases `@/domain/*` to `../src/domain/*`, so these are
 * the same types on the server. That is the whole point: a field renamed here
 * fails to compile in two codebases rather than failing at runtime in one.
 *
 * The prose that types cannot carry — status codes, error meaning, the token
 * lifecycle, ordering guarantees, authorization — lives in `docs/api.md`. Where
 * that document and this file disagree, this file is right.
 *
 * Conventions, applied without exception:
 *   - Instants are ISO 8601 strings in UTC:      '2026-09-10T13:57:00.000Z'
 *   - Calendar days are 'YYYY-MM-DD':            '2026-09-10'
 *   - Ids are UUID v4 strings
 *   - Absent means `null`, never omitted, never ''
 */
import type { AuthProvider, OAuthProvider } from './auth.ts';
import type {
  ActivitySource,
  Discipline,
  Purpose,
  UnitSystem,
  Zone,
} from './training.ts';

export type { AuthProvider, OAuthProvider } from './auth.ts';

/** An ISO 8601 instant in UTC. Distinct from `DateKey`, which is a local day. */
export type Instant = string;

/** A calendar day, 'YYYY-MM-DD'. Never converted to or from UTC. */
export type DayKey = string;

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * Every non-2xx response. `message` is for logs and developers; the app renders
 * its own copy from `code`, so a wording change is never a client change.
 */
export type ErrorDTO = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export type TokenPairDTO = {
  /** JWT, short-lived. */
  accessToken: string;
  /** Opaque, long-lived, rotated on every use. */
  refreshToken: string;
  /** When `accessToken` expires, so the client can refresh before a 401. */
  expiresAt: Instant;
};

/**
 * The identity, not the athlete. Name and date of birth are the profile's, and
 * a signed-in user may legitimately have no profile yet.
 */
export type AuthUserDTO = {
  uid: string;
  email: string;
  emailVerified: boolean;
  /** Which sign-in methods are attached, so the app can offer the rest. */
  providers: AuthProvider[];
};

export type SignUpRequest = { email: string; password: string; timezone: string };
export type SignInRequest = { email: string; password: string };

/**
 * Exchanges a provider's identity token for this API's own token pair.
 *
 * The provider token is used once, here, and never stored: the session that
 * follows is carried by our access and refresh tokens like any other.
 */
export type OAuthRequest = {
  provider: OAuthProvider;
  /** The provider's ID token (a JWT), verified server-side against its JWKS. */
  idToken: string;
  /** Raw nonce the client generated; its hash was sent to the provider. */
  nonce: string;
  /**
   * Apple returns the full name only on the very first authorization, and only
   * to the client SDK — never in the identity token, and never again. Forward
   * it here or it is lost permanently.
   */
  fullName?: string;
  /** Required when creating an account, ignored when signing in to one. */
  timezone?: string;
};

/** Attaches another provider to the account already signed in. */
export type LinkRequest =
  | { provider: OAuthProvider; idToken: string; nonce: string }
  | { provider: 'email'; password: string };

export type RefreshRequest = { refreshToken: string };
export type SignOutRequest = { refreshToken: string };

export type SessionResponse = TokenPairDTO & { user: AuthUserDTO };

// ─── Profile ─────────────────────────────────────────────────────────────────

export type UserDTO = {
  id: string;
  name: string;
  dateOfBirth: DayKey;
  sex: 'male' | 'female' | 'other';
  /**
   * IANA zone, 'Europe/Dublin'. The server cannot decide what day it is for this
   * athlete without it — which it must, to generate a plan or mark a session
   * missed.
   */
  timezone: string;
  units: UnitSystem;
  createdAt: Instant | null;
  modifiedAt: Instant | null;
};

export type ProfileDraft = {
  name: string;
  dateOfBirth: DayKey;
  sex: UserDTO['sex'];
  timezone: string;
  units: UnitSystem;
};

// ─── Sessions ────────────────────────────────────────────────────────────────

export type SegmentDTO = {
  startSeconds: number;
  durationSeconds: number;
  /** Relative effort, 0-1. */
  intensity: number;
  zone: Zone;
  drill: boolean;
};

export type SessionTargetsDTO = {
  durationSeconds?: number;
  distanceMetres?: number;
  /** Seconds per kilometre. Read as pace or speed depending on discipline. */
  paceSecondsPerKm?: number;
  /** 0-10. */
  load?: number;
  /** Whether the figures are estimates — the design's asterisk. */
  estimated?: boolean;
};

export type CompletionDTO = {
  /** Server-assigned. A value sent by a client is ignored. */
  completedAt: Instant;
  activityId: string | null;
};

export type SessionDTO = {
  id: string;
  date: DayKey;
  /** Position within the day, so two sessions on one date have a fixed order. */
  order: number;
  title: string;
  discipline: Discipline;
  purpose: Purpose | null;
  focus: string[];
  equipment: string[];
  descriptor: string | null;
  targets: SessionTargetsDTO;
  segments: SegmentDTO[];
  /** Chart axis length. Not `targets.durationSeconds`: the axis must not shrink
   *  to the last effort when a session ends with a long cool-down. */
  chartSeconds: number | null;
  tickEveryMinutes: number | null;
  completion: CompletionDTO | null;
  coachName: string | null;
  coachNote: string | null;
};

export type CompletionRequest = { completion: CompletionDTO | null };

// ─── Plans and races ─────────────────────────────────────────────────────────

export type PlanDTO = {
  id: string;
  name: string;
  status: 'current' | 'upcoming' | 'complete';
  phase: string | null;
  startDate: DayKey;
  endDate: DayKey;
  weeks: number;
  /** One entry per week. Denormalised so the dashboard card costs one row. */
  weeklyPlannedHours: number[];
  /** 0-based index into `weeklyPlannedHours`. */
  currentWeekIndex: number | null;
  currentWeekProgress: number | null;
  raceId: string | null;
  artworkUrl: string | null;
};

export type RaceLegDTO = { discipline: Discipline; distanceMetres: number };

export type RaceDTO = {
  id: string;
  name: string;
  place: string;
  date: DayKey;
  priority: 'A' | 'B' | 'C';
  /** In race order. */
  legs: RaceLegDTO[];
  targetSeconds: number | null;
  artworkUrl: string | null;
};

// ─── Schedule ────────────────────────────────────────────────────────────────

export type CommitmentDTO = {
  id: string;
  label: string;
  /** 0-6, 0 = Sunday, matching `Date.prototype.getDay`. */
  weekday: number;
  discipline: Discipline | null;
};

export type ScheduleDTO = {
  /** Exactly 7 entries, index 0 = Sunday. A shorter array is rejected. */
  availableMinutes: number[];
  commitments: CommitmentDTO[];
  modifiedAt: Instant | null;
};

export type ScheduleDraft = {
  availableMinutes: number[];
  commitments: CommitmentDTO[];
};

// ─── Onboarding ──────────────────────────────────────────────────────────────

export type AthleteMetricsDTO = {
  heightCm: number | null;
  weightKg: number | null;
  heartRateMin: number | null;
  heartRateMax: number | null;
  cyclingFtp: number | null;
  runPaceSecondsPerKm: number | null;
  swimPaceSecondsPer100m: number | null;
  modifiedAt: Instant | null;
};

export type OnboardingCompleteRequest = {
  profile: { name: string; dateOfBirth: DayKey; sex: UserDTO['sex']; timezone: string };
  units: UnitSystem;
  metrics: {
    heightCm?: number;
    weightKg?: number;
    heartRateMin?: number;
    heartRateMax?: number;
    cyclingFtp?: number;
    runPaceSecondsPerKm?: number;
    swimPaceSecondsPer100m?: number;
  };
  schedule: { availableMinutes: number[]; commitments: Omit<CommitmentDTO, 'id'>[] };
  race?: {
    name: string;
    place: string;
    date: DayKey;
    priority: RaceDTO['priority'];
    targetSeconds: number | null;
    legs: RaceLegDTO[];
  } | null;
  weeklyHours: number;
};

export type OnboardingCompleteResponse = {
  profile: UserDTO;
  metrics: AthleteMetricsDTO;
  schedule: ScheduleDTO;
  race: RaceDTO | null;
  plan: PlanDTO;
};

// ─── Activities ──────────────────────────────────────────────────────────────

export type RoutePointDTO = { x: number; y: number };

export type ActivityStatsDTO = {
  distanceMetres?: number;
  durationSeconds?: number;
  paceSecondsPerKm?: number;
  averageHeartRate?: number;
  calories?: number;
};

export type ActivityDTO = {
  id: string;
  /** An instant, not a day: an activity happened at a moment in time. */
  startedAt: Instant;
  title: string;
  discipline: Discipline;
  place: string | null;
  /** Normalised 0-1 in both axes. A polyline to draw, never queried. */
  route: RoutePointDTO[];
  sources: ActivitySource[];
  stats: ActivityStatsDTO;
  sessionId: string | null;
};

// ─── Pagination ──────────────────────────────────────────────────────────────

/**
 * One page of a collection with no bound.
 *
 * `cursor` is opaque: the client passes back what it was given and parses
 * nothing, so the server can change its encoding without a version bump. Null
 * means there is no page after this one.
 */
export type PageDTO<T> = {
  items: T[];
  cursor: string | null;
};

// ─── Streaming ───────────────────────────────────────────────────────────────

/**
 * Resource kinds that appear on the change stream. See `docs/streaming.md`.
 */
export const CHANGE_RESOURCES = [
  'profile',
  'session',
  'plan',
  'race',
  'schedule',
  'activity',
] as const;
export type ChangeResource = (typeof CHANGE_RESOURCES)[number];

/** What an upsert of each resource carries. */
type ChangePayloads = {
  profile: UserDTO;
  session: SessionDTO;
  plan: PlanDTO;
  race: RaceDTO;
  schedule: ScheduleDTO;
  activity: ActivityDTO;
};

/**
 * One change, as a discriminated union — so narrowing on `resource` and `op`
 * gives the client the right payload type without a cast.
 *
 * An upsert carries the whole document rather than an id: SSE has no payload
 * cap (that limit belongs to `pg_notify`, which only ever carries a nudge), so
 * the client applies the change without a follow-up fetch.
 */
export type ChangeEvent = {
  [R in ChangeResource]:
    | { resource: R; op: 'upsert'; id: string; payload: ChangePayloads[R] }
    | { resource: R; op: 'delete'; id: string };
}[ChangeResource];

/**
 * The server cannot catch this client up — its cursor is older than the change
 * log's retention, or the account changed underneath it. The client discards
 * its cache and refetches the snapshot rather than believing a partial picture.
 */
export type ResetEvent = { reason: 'cursor_too_old' | 'account_changed' };

/**
 * The change-log position a read reflects, returned as the `X-Change-Cursor`
 * response header rather than wrapped around the body — the API client captures
 * it once for every request, and paged responses keep their own `cursor`
 * meaning only "the next page".
 */
export const CHANGE_CURSOR_HEADER = 'X-Change-Cursor';

// ─── Trends ──────────────────────────────────────────────────────────────────

/** Which way a figure has moved over the window. */
export type TrendDirection = 'up' | 'down' | 'flat';

export type TrendFigureDTO = {
  value: number;
  direction: TrendDirection;
  /** Change across the window, in the figure's own units. */
  change: number;
};

export type VolumeDTO = {
  durationSeconds: number;
  distanceMetres: number;
};

/**
 * Aggregates over a span of days — the one screen that asks the database a
 * question rather than for a list of rows.
 *
 * `fitness` and `fatigue` are exponentially weighted averages of daily
 * training load, over 42 and 7 days. `form` is their difference: it climbs
 * during a taper, when fatigue falls away faster than fitness does, and goes
 * negative in a hard block.
 */
export type TrendsDTO = {
  from: DayKey;
  to: DayKey;
  planned: VolumeDTO;
  completed: VolumeDTO;
  fitness: TrendFigureDTO;
  fatigue: TrendFigureDTO;
  form: TrendFigureDTO;
};
