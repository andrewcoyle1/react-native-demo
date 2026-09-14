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
  SessionConnection,
  SessionModel,
  SessionsService,
} from './sessions-service';

import type { SegmentDTO, SessionConnectionDTO, SessionDTO } from '@/domain/wire.ts';
import { api } from '@/services/api/client';
import { queuedWrite } from '@/providers/shared/pending-writes';

const toSegment = (dto: SegmentDTO): SegmentModel => ({ ...dto });

/** The one field JSON cannot carry: a sync stamp is an instant, not a string. */
const toConnection = (dto: SessionConnectionDTO): SessionConnection => ({
  kind: dto.kind,
  syncedAt: dto.syncedAt ? new Date(dto.syncedAt) : null,
});

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
    /*
     * Defaulted, every one of them. These fields were added to the contract
     * after the API was deployed, and a server that predates them omits them
     * entirely — so `dto.connections.map(...)` threw "Cannot read property
     * 'map' of undefined" and took the whole dashboard down with it. The model
     * keeps them required; absorbing the difference is this converter's job,
     * which is what it is for.
     */
    bands: dto.bands ?? [],
    /* The step tree crosses unchanged: it holds no dates, so the wire shape and
       the model shape are the same type in different names. */
    sets: dto.sets ?? [],
    intensity: dto.intensity ?? null,
    estimateBasis: dto.estimateBasis ?? null,
    connections: (dto.connections ?? []).map(toConnection),
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
  async get(_uid, sessionId) {
    return toSession(await api.get<SessionDTO>(`/v1/sessions/${sessionId}`));
  },

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
