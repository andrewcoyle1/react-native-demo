/**
 * `/v1/activities`, in two forms.
 *
 * Paged, for the history the Activities tab walks; and windowed, for the week
 * the Plan tab sets against its sessions. They are mutually exclusive, and
 * sending both is a mistake worth naming rather than silently resolving.
 */
import type { FastifyInstance } from 'fastify';

import { authenticate } from '../plugins/authenticate.ts';
import { badRequest } from '../errors.ts';
import * as activities from './service.ts';

const day = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } as const;

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/v1/activities',
    {
      preHandler: authenticate,
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            cursor: { type: 'string', maxLength: 128 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            from: day,
            to: day,
          },
        },
      },
    },
    async request => {
      const { cursor, limit, from, to } = request.query as {
        cursor?: string;
        limit?: number;
        from?: string;
        to?: string;
      };

      const windowed = from !== undefined || to !== undefined;
      const paged = cursor !== undefined || limit !== undefined;

      if (windowed && paged) {
        throw badRequest(
          'invalid_query',
          'Ask for a window or a page, not both.',
        );
      }

      if (windowed) {
        if (from === undefined || to === undefined) {
          throw badRequest('invalid_window', 'A window needs both `from` and `to`.');
        }

        // A window is bounded already, so it needs no cursor — and returning
        // the same envelope for both shapes would make `cursor: null` ambiguous.
        return activities.readWindow(request.userId!, from, to);
      }

      return activities.readPage(request.userId!, cursor ?? null, limit);
    },
  );

  /*
   * Declared after the collection route, and it has to be: Fastify's router
   * matches a static segment before a parameterised one either way, but keeping
   * the order obvious means nobody later wonders whether `/v1/activities` is
   * being swallowed by `:id`.
   */
  app.get(
    '/v1/activities/:id',
    {
      preHandler: authenticate,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async request => {
      const { id } = request.params as { id: string };
      return activities.readOne(request.userId!, id);
    },
  );
}
