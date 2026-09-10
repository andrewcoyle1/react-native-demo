/**
 * `/v1/plans`, `/v1/races` and `/v1/schedule`.
 *
 * Two of the three are read-only, and that is enforced by there being no route
 * to write them rather than by a check inside one.
 */
import type { FastifyInstance } from 'fastify';

import type { PlanDTO } from '../domain.ts';
import { authenticate } from '../plugins/authenticate.ts';
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
