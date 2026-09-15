/**
 * `/v1/plans`, `/v1/races` and `/v1/schedule`.
 *
 * Races are read-only, and so is the *inside* of a plan: there is no route
 * that edits a plan's weeks, its sessions or its progress, because the backend
 * authors those. The collection itself the athlete does control — `POST` adds
 * a plan and `DELETE` empties the collection — which is a narrower thing than
 * it sounds, since a plan is only ever created whole from a race and the
 * athlete's stored schedule.
 */
import type { FastifyInstance } from 'fastify';

import type { PlanDTO, RaceDraftDTO } from '../domain.ts';
import { authenticate } from '../plugins/authenticate.ts';
import { race } from '../onboarding/routes.ts';
import * as training from './service.ts';

const PLAN_STATUSES = ['current', 'upcoming', 'complete'] as const;

export async function trainingRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/v1/plans',
    {
      preHandler: authenticate,
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            // Comma-separated, so the default of current+upcoming needs no array
            // syntax in the query string.
            status: { type: 'string', maxLength: 64 },
          },
        },
      },
    },
    async request => {
      const { status } = request.query as { status?: string };

      const statuses = status
        ?.split(',')
        .map(value => value.trim())
        .filter((value): value is PlanDTO['status'] =>
          (PLAN_STATUSES as readonly string[]).includes(value),
        );

      return training.readPlans(request.userId!, statuses?.length ? statuses : undefined);
    },
  );

  /**
   * Adds a plan to an athlete who already has a profile.
   *
   * The body carries only the race, or null for an open training goal:
   * everything else a plan needs is already stored against the athlete.
   */
  app.post(
    '/v1/plans',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['race'],
          additionalProperties: false,
          properties: { race: { anyOf: [race, { type: 'null' }] } },
        },
      },
    },
    async (request, reply) => {
      const { race: draft } = request.body as { race: RaceDraftDTO | null };
      reply.code(201);
      return training.addPlan(request.userId!, draft);
    },
  );

  app.delete(
    '/v1/plans',
    { preHandler: authenticate },
    async (request, reply) => {
      await training.resetPlans(request.userId!);
      reply.code(204);
    },
  );

  app.get('/v1/races', { preHandler: authenticate }, async request =>
    training.readRaces(request.userId!),
  );

  app.get('/v1/schedule', { preHandler: authenticate }, async request =>
    training.readSchedule(request.userId!),
  );

  app.put(
    '/v1/schedule',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {
            availableMinutes: {
              type: 'array',
              // Exactly seven, so a weekday index can never run off the end.
              minItems: 7,
              maxItems: 7,
              items: { type: 'integer', minimum: 0, maximum: 1440 },
            },
            commitments: {
              type: 'array',
              maxItems: 50,
              items: {
                type: 'object',
                required: ['label', 'weekday'],
                additionalProperties: false,
                properties: {
                  // Ids are the server's: the client sends the set it wants to
                  // exist, and gets back whatever now exists.
                  label: { type: 'string', minLength: 1, maxLength: 100 },
                  weekday: { type: 'integer', minimum: 0, maximum: 6 },
                  discipline: {
                    type: ['string', 'null'],
                    enum: ['swim', 'run', 'ride', 'weights', null],
                  },
                },
              },
            },
          },
        },
      },
    },
    async request => training.writeSchedule(request.userId!, request.body as training.ScheduleDraft),
  );
}
