/**
 * `SessionsService` over the Stamina API.
 *
 * Read windowed, never whole: an athlete accumulates sessions for as long as
 * they train, and the API refuses an unbounded span rather than serving one.
 *
 * `markComplete` goes through the pending-write queue, so completing a session
 * at a pool with no signal records the intent and sends it when the phone finds
 * a network again. That write is a PATCH carrying the whole desired state, so
 * replaying it is harmless.
 */
import type {
  SegmentModel,
  SessionCompletion,
  SessionModel,
  SessionsService,
} from './sessions-service';

import type { SegmentDTO, SessionDTO } from '@/domain/wire.ts';
import { api } from '@/services/api/client';
import { queuedWrite } from '@/providers/shared/pending-writes';

const toSegment = (dto: SegmentDTO): SegmentModel => ({ ...dto });

function toSession(dto: SessionDTO): SessionModel {
  return {
    id: dto.id,
    date: dto.date,
    order: dto.order,
    title: dto.title,
    discipline: dto.discipline,
    purpose: dto.purpose,
    focus: dto.focus,
    equipment: dto.equipment,
    descriptor: dto.descriptor,
    targets: dto.targets,
    segments: dto.segments.map(toSegment),
    chartSeconds: dto.chartSeconds,
    tickEveryMinutes: dto.tickEveryMinutes,
    completion: dto.completion
      ? {
          completedAt: new Date(dto.completion.completedAt),
          activityId: dto.completion.activityId,
        }
      : null,
    coachName: dto.coachName,
    coachNote: dto.coachNote,
  };
}

export const apiSessionsService: SessionsService = {
  subscribe(_uid, window, onSessions, onError) {
    const controller = new AbortController();

    api
      .get<SessionDTO[]>(`/v1/sessions?from=${window.from}&to=${window.to}`, {
        signal: controller.signal,
      })
      .then(dtos => onSessions(dtos.map(toSession)))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        onError(error instanceof Error ? error : new Error('Could not load your sessions.'));
      });

    return () => controller.abort();
  },

  async markComplete(_uid, sessionId, completion: SessionCompletion | null) {
    /*
     * Keyed by session, so tapping twice offline queues one write rather than
     * two — and the second replaces the first, which is what the athlete meant.
     *
     * `completedAt` is not sent: the server assigns it, so a phone with a wrong
     * clock cannot backdate a session, and a write that waits three days in the
     * queue is stamped when it actually lands.
     */
    await queuedWrite(
      `session-completion:${sessionId}`,
      'PATCH',
      `/v1/sessions/${sessionId}/completion`,
      { completion: completion ? { activityId: completion.activityId } : null },
    );
  },
};
