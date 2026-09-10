/**
 * `/v1/sessions`.
 *
 * The window is required rather than defaulted: this is the collection where an
 * unbounded read is always a mistake, so the API declines to guess.
 */
import type { FastifyInstance } from 'fastify';

import { authenticate } from '../plugins/authenticate.ts';
import * as sessions from './service.ts';

const day = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } as const;

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/v1/sessions',
    {
      preHandler: authenticate,
      schema: {
        querystring: {
          type: 'object',
          required: ['from', 'to'],
          additionalProperties: false,
          properties: { from: day, to: day },
        },
      },
    },
    async request => {
      const { from, to } = request.query as { from: string; to: string };
      return sessions.readWindow(request.userId!, from, to);
    },
  );

  app.patch(
    '/v1/sessions/:id/completion',
    {
      preHandler: authenticate,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          required: ['completion'],
          additionalProperties: false,
          properties: {
            completion: {
              // Null un-completes, which is a legitimate edit.
              type: ['object', 'null'],
              additionalProperties: false,
              properties: {
                // `completedAt` is deliberately not accepted: the server
                // assigns it. A client that sends one is having it ignored.
                activityId: { type: ['string', 'null'], format: 'uuid' },
              },
            },
          },
        },
      },
    },
    async request => {
      const { id } = request.params as { id: string };
      const { completion } = request.body as {
        completion: { activityId?: string | null } | null;
      };

      return sessions.setCompletion(request.userId!, id, completion);
    },
  );
}
