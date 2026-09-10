/**
 * Plans, races and the schedule.
 *
 * Plans and races are read-only here on purpose: the backend authors them, so
 * this file exposes no way for a request to create or change one. The schedule
 * is the athlete's, and is the only thing that writes.
 */
import type { CommitmentDTO, PlanDTO, RaceDTO, ScheduleDTO } from '../domain.ts';
import { pool, transaction } from '../db.ts';
import { notFound } from '../errors.ts';
import * as q from './queries.ts';

/** Completed plans are excluded unless asked for: no screen shows one. */
const DEFAULT_STATUSES: PlanDTO['status'][] = ['current', 'upcoming'];

export function readPlans(
  userId: string,
  statuses: PlanDTO['status'][] = DEFAULT_STATUSES,
): Promise<PlanDTO[]> {
  return q.findPlans(userId, statuses, pool);
}

export function readRaces(userId: string): Promise<RaceDTO[]> {
  return q.findRaces(userId, pool);
}

export async function readSchedule(userId: string): Promise<ScheduleDTO> {
  const schedule = await q.findSchedule(userId, pool);

  if (!schedule) {
    // Like a missing profile: a state the app models, not a failure.
    throw notFound('schedule_not_found', 'This account has no schedule yet.');
  }

  return schedule;
}

export type ScheduleDraft = {
  availableMinutes?: number[];
  commitments?: Omit<CommitmentDTO, 'id'>[];
};

/**
 * Upserts the schedule. The first write creates it.
 *
 * Availability and commitments live in different tables, so both go inside one
 * transaction: a half-applied schedule — new hours against old commitments — is
 * a plan the athlete never asked for.
 */
export async function writeSchedule(
  userId: string,
  draft: ScheduleDraft,
): Promise<ScheduleDTO> {
  return transaction(async db => {
    if (draft.availableMinutes) {
      await q.upsertAvailability(userId, draft.availableMinutes, db);
    } else if (!(await q.hasSchedule(userId, db))) {
      // Commitments hang off a schedule row; without availability there is
      // nothing to create one from.
      throw notFound(
        'schedule_not_found',
        'Set your available time before adding commitments.',
      );
    }

    if (draft.commitments) {
      await q.replaceCommitments(userId, draft.commitments, db);
    }

    const schedule = await q.findSchedule(userId, db);
    return schedule!;
  });
}
