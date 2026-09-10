/**
 * The trends seam.
 *
 * The only slice that asks the backend a question rather than for rows. Every
 * figure here is derived — a sum, or an exponentially weighted average over
 * months of training load — which is work the client should not be doing,
 * because doing it would mean first downloading everything it aggregates.
 */
import type { DateRange } from '@/domain/training';

export type TrendDirection = 'up' | 'down' | 'flat';

export type TrendFigure = {
  value: number;
  direction: TrendDirection;
  /** Change across the window, in the figure's own units. */
  change: number;
};

export type Volume = {
  durationSeconds: number;
  distanceMetres: number;
};

export type TrendsModel = {
  planned: Volume;
  completed: Volume;
  /** Chronic training load: what the athlete has built. */
  fitness: TrendFigure;
  /** Acute training load: what they are currently carrying. */
  fatigue: TrendFigure;
  /** Fitness less fatigue. Climbs through a taper, negative in a hard block. */
  form: TrendFigure;
};

export interface TrendsService {
  subscribe(
    uid: string,
    window: DateRange,
    onTrends: (trends: TrendsModel) => void,
    onError: (error: Error) => void,
  ): () => void;
}
