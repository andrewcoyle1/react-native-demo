/**
 * The sessions seam.
 *
 * A session is what the plan asks the athlete to do on a given day. The backend
 * writes them; the client reads a window of them and marks them complete.
 *
 * Presentation-free by design: no SF Symbols, no hex, no formatted strings. A
 * swim is `discipline: 'swim'` and `distanceMetres: 2700`, and it is
 * `session-presenter.ts` that decides those mean a blue `figure.pool.swim` and
 * the text "2700 m". The sample data this replaces stored the icon and the
 * colour in the fixture, which is exactly what could not have come out of
 * Firestore.
 */
import type {
  ConnectionKind,
  DateKey,
  DateRange,
  Discipline,
  Intensity,
  Purpose,
  SetKind,
  StepZone,
  Zone,
} from '@/domain/training';

/** One effort block on the session chart. */
export type SegmentModel = {
  /** Seconds from the start of the session. */
  startSeconds: number;
  durationSeconds: number;
  /** Relative effort, 0-1. */
  intensity: number;
  zone: Zone;
  /** Drill work, which the chart hatches as well as colours. */
  drill: boolean;
};

/**
 * What the session is asking for, in SI units.
 *
 * Every field is optional because the disciplines ask for different things: a
 * strength commitment has no distance, and a swim has no pace per kilometre that
 * anyone would quote.
 */
export type SessionTargets = {
  durationSeconds?: number;
  distanceMetres?: number;
  /** Seconds per kilometre. Rendered as pace or speed by discipline. */
  paceSecondsPerKm?: number;
  /** Training load, 0-10. */
  load?: number;
  /**
   * Whether the figures are the plan's estimates rather than fixed targets —
   * the design marks those with an asterisk ("Est. dist*").
   */
  estimated?: boolean;
};

/** What the athlete actually did, once they have done it. */
export type SessionCompletion = {
  completedAt: Date;
  /** The recorded activity this was matched to, when there is one. */
  activityId: string | null;
};

/**
 * The recovery after a step.
 *
 * `seconds` is a fixed rest; `open` is the athlete's own call ("Open rest"),
 * which is a different instruction rather than a rest of unknown length.
 */
export type StepRest = { seconds: number | null; open: boolean };

/**
 * One instruction in a workout, or a group of them.
 *
 * Recursive because swim sets are: a main set is "3 rounds of (2 × 50m board
 * wag, 2 × 50m freestyle)", and flattening that would lose the structure the
 * athlete counts their way through at the wall.
 */
export type WorkoutStep =
  | {
      kind: 'repeat';
      /** How many times the children run. */
      times: number;
      children: WorkoutStep[];
      rest: StepRest | null;
    }
  | {
      kind: 'effort';
      /** Prescribed distance, when the step is written as one. */
      distanceMetres: number | null;
      /** Prescribed time, when the step is written as one. */
      durationSeconds: number | null;
      /** What to do — 'Freestyle', 'Body Position Kick', 'Choice'. */
      name: string;
      zone: StepZone | null;
      /** Kit this step alone needs, beyond the session's own list. */
      equipment: string[];
      /** A drill demonstration exists for this movement. */
      hasVideo: boolean;
      /** Coaching cue shown under the step, truncated until opened. */
      note: string | null;
      rest: StepRest | null;
      /**
       * A step written as a composite — "100m as 50m Z5 / 50m Z1". The parts
       * are the real instruction; the parent carries the total.
       */
      parts: WorkoutStep[];
    };

/**
 * A named group of steps — 'Warmup set', 'Main set'.
 *
 * Presentation-free: the colour each set is drawn in belongs to the presenter,
 * which keys it off `kind`.
 */
export type WorkoutSet = {
  id: string;
  kind: SetKind;
  /** The set's own label, when the plan names it something specific. */
  title: string | null;
  steps: WorkoutStep[];
};

/**
 * A labelled span of the interval chart — the WU / DRL / MAIN / SKL bands a
 * swim session is read in. Drawn above the bars with dashed separators.
 */
export type ChartBand = {
  kind: SetKind;
  startSeconds: number;
  durationSeconds: number;
};

/** Where a planned session can be sent, and when it last went. */
export type SessionConnection = {
  kind: ConnectionKind;
  /** Last successful sync, or null when it has never been sent. */
  syncedAt: Date | null;
};

export type SessionModel = {
  id: string;
  /** The calendar day this belongs to, in the athlete's own timezone. */
  date: DateKey;
  /** Position within the day, so two sessions on one date have a fixed order. */
  order: number;
  title: string;
  discipline: Discipline;
  purpose: Purpose | null;
  /** Technique tags — 'Body position', 'Kicking'. */
  focus: string[];
  /** Kit to bring — 'Snorkel', 'Board'. */
  equipment: string[];
  /** A short descriptor beside the purpose chip — 'Long run', 'Easy ride'. */
  descriptor: string | null;
  targets: SessionTargets;
  segments: SegmentModel[];
  /**
   * Length of the chart's axis. Held separately from `targets.durationSeconds`
   * because the axis must not shrink to the last effort when a session ends with
   * a long cool-down.
   */
  chartSeconds: number | null;
  /** Axis label spacing, in minutes, when the default reads too densely. */
  tickEveryMinutes: number | null;
  /**
   * Labelled spans over the chart. Empty for a session read as one block; a
   * swim's warm-up/drill/main/skill/speed/warm-down structure fills it.
   */
  bands: ChartBand[];
  /**
   * The workout written out, set by set. Empty for a bare commitment, and for
   * any session the plan describes only as a shape.
   */
  sets: WorkoutSet[];
  /** Overall effort, for the summary tile. Null when the plan does not say. */
  intensity: Intensity | null;
  /**
   * What the estimates were derived from — "run threshold pace of 4:30/km".
   * Shown as a footnote under the metrics, explaining every asterisk above it.
   */
  estimateBasis: string | null;
  /** Export targets for this session. Empty when there is nowhere to send it. */
  connections: SessionConnection[];
  completion: SessionCompletion | null;
  coachName: string | null;
  coachNote: string | null;
};

export interface SessionsService {
  /**
   * Live sessions within `window`, ordered by date then `order`.
   *
   * Windowed rather than whole-collection: an athlete accumulates sessions for
   * as long as they train, and no screen ever wants all of them.
   */
  subscribe(
    uid: string,
    window: DateRange,
    onSessions: (sessions: SessionModel[]) => void,
    onError: (error: Error) => void,
  ): () => void;

  /**
   * The one write the client makes here. Pass null to un-complete a session.
   *
   * The security rules allow no other field to change, because the plan itself
   * is the backend's to author.
   */
  markComplete(uid: string, sessionId: string, completion: SessionCompletion | null): Promise<void>;

  /**
   * One session by id, for the detail sheet.
   *
   * A separate read rather than a lookup in whatever window happens to be
   * mounted: the sheet is a root-level route, so it opens above the providers
   * and cannot see their data. Resolves to null when the session is gone.
   */
  get(uid: string, sessionId: string): Promise<SessionModel | null>;
}
