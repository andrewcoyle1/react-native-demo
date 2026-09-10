/** `/v1/trends`. */
import type { FastifyInstance } from 'fastify';

import { authenticate } from '../plugins/authenticate.ts';
import * as trends from './service.ts';

const day = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } as const;

export async function trendRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/v1/trends',
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
      return trends.readTrends(request.userId!, from, to);
    },
  );
}
