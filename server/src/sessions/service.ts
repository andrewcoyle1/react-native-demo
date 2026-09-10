/**
 * Planned sessions.
 *
 * Read-only apart from completion. The backend authors the plan, so there is no
 * route here that creates or edits a session — only one that records that the
 * athlete did it.
 */
import type { SessionDTO } from '../domain.ts';
import { pool } from '../db.ts';
import { badRequest, notFound } from '../errors.ts';

import * as q from './queries.ts';

/**
 * The widest window the API will answer.
 *
 * An athlete accumulates sessions for as long as they train, and an unbounded
 * read of this collection is always a mistake — so it is refused rather than
 * quietly permitted.
 */
const MAX_WINDOW_DAYS = 400;

const DAY_MS = 86_400_000;

export function readWindow(userId: string, from: string, to: string): Promise<SessionDTO[]> {
  if (from > to) {
    throw badRequest('invalid_window', '`from` must not be after `to`.');
  }

  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;

  if (!Number.isFinite(span)) {
    throw badRequest('invalid_window', 'Both `from` and `to` must be YYYY-MM-DD.');
  }

  if (span > MAX_WINDOW_DAYS) {
    throw badRequest(
      'window_too_wide',
      `Ask for at most ${MAX_WINDOW_DAYS} days at a time.`,
    );
  }

  return q.findWindow(userId, from, to, pool);
}

/**
 * Marks a session complete, or clears it.
 *
 * `completedAt` is never taken from the caller — the column is set to `now()`
 * by the statement — so a wrong phone clock cannot backdate a session.
 */
export async function setCompletion(
  userId: string,
  sessionId: string,
  completion: { activityId?: string | null } | null,
): Promise<SessionDTO> {
  const updated = await q.setCompletion(
    userId,
    sessionId,
    completion?.activityId ?? null,
    completion !== null,
    pool,
  );

  if (!updated) {
    // Someone else's session and a session that does not exist are the same
    // answer: there is no way to probe for one from here.
    throw notFound('session_not_found', 'No session with that id.');
  }

  const session = await q.findOne(userId, sessionId, pool);
  return session!;
}
