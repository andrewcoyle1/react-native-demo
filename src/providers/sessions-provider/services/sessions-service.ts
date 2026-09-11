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
import type { DateKey, DateRange, Discipline, Purpose, Zone } from '@/domain/training';

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
}
