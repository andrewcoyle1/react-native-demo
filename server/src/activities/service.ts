/**
 * Recorded activities.
 *
 * Read-only to the client. These arrive from a watch or a sync integration —
 * neither of which exists yet — so nothing here writes, and there is no route
 * that does.
 */
import type { ActivityDTO } from '../domain.ts';
import { pool } from '../db.ts';
import { badRequest } from '../errors.ts';

import * as q from './queries.ts';

export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Matches the sessions window: this is a screen's worth, not an archive. */
const MAX_WINDOW_DAYS = 400;
const DAY_MS = 86_400_000;

export function readPage(
  userId: string,
  cursor: string | null,
  limit = DEFAULT_PAGE_SIZE,
): Promise<q.Page> {
  return q.findPage(userId, cursor, Math.min(limit, MAX_PAGE_SIZE), pool);
}

export function readWindow(userId: string, from: string, to: string): Promise<ActivityDTO[]> {
  if (from > to) {
    throw badRequest('invalid_window', '`from` must not be after `to`.');
  }

  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;

  if (span > MAX_WINDOW_DAYS) {
    throw badRequest('window_too_wide', `Ask for at most ${MAX_WINDOW_DAYS} days at a time.`);
  }

  return q.findWindow(userId, from, to, pool);
}
