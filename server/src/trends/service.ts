/**
 * Aggregates for the Trends screen.
 *
 * The only endpoint that computes rather than returns. Everything here could be
 * done on the client — given the client first downloaded every activity the
 * athlete has ever recorded, which is precisely the reason not to.
 */
import type { TrendDirection, TrendFigureDTO, TrendsDTO } from '../domain.ts';
import { pool } from '../db.ts';
import { badRequest } from '../errors.ts';

import * as q from './queries.ts';

const MAX_WINDOW_DAYS = 400;
const DAY_MS = 86_400_000;

/**
 * Below this, a change is noise rather than a direction.
 *
 * Fitness moves by fractions of a point a day, so without a floor every window
 * would report an arrow — which tells the athlete nothing.
 */
const SIGNIFICANT_CHANGE = 0.5;

function toFigure(first: number, last: number): TrendFigureDTO {
  const change = last - first;

  const direction: TrendDirection =
    Math.abs(change) < SIGNIFICANT_CHANGE ? 'flat' : change > 0 ? 'up' : 'down';

  // Rounded to one decimal: these are indices, and more precision would imply
  // an accuracy the inputs do not have.
  return {
    value: Math.round(last * 10) / 10,
    direction,
    change: Math.round(change * 10) / 10,
  };
}

export async function readTrends(userId: string, from: string, to: string): Promise<TrendsDTO> {
  if (from > to) {
    throw badRequest('invalid_window', '`from` must not be after `to`.');
  }

  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;

  if (!Number.isFinite(span)) {
    throw badRequest('invalid_window', 'Both `from` and `to` must be YYYY-MM-DD.');
  }

  if (span > MAX_WINDOW_DAYS) {
    throw badRequest('window_too_wide', `Ask for at most ${MAX_WINDOW_DAYS} days at a time.`);
  }

  // Three independent reads, so they go together rather than in sequence.
  const [planned, completed, series] = await Promise.all([
    q.findPlanned(userId, from, to, pool),
    q.findCompleted(userId, from, to, pool),
    q.findLoadSeries(userId, from, to, pool),
  ]);

  const first = series[0] ?? { fitness: 0, fatigue: 0 };
  const last = series.at(-1) ?? first;

  return {
    from,
    to,
    planned,
    completed,
    fitness: toFigure(first.fitness, last.fitness),
    fatigue: toFigure(first.fatigue, last.fatigue),
    // Form is the difference, so its trend is the difference of the trends —
    // computed from the same endpoints rather than from a third series.
    form: toFigure(first.fitness - first.fatigue, last.fitness - last.fatigue),
  };
}
