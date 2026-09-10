/**
 * The Fastify application, built but not listening.
 *
 * Separated from `index.ts` so tests can build an app and call it through
 * `inject()` — no port, no sockets, no teardown races.
 */
import Fastify, { type FastifyInstance } from 'fastify';

import { authRoutes } from './auth/routes.ts';
import { pool } from './db.ts';
import { ApiError } from './errors.ts';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      // Never log a token or a password, however deeply nested.
      redact: ['req.headers.authorization', 'body.password', 'body.refreshToken'],
    },
  });

  /**
   * Liveness *and* readiness: a process that cannot reach Postgres is not
   * serving anything useful, so it should not report itself healthy.
   */
  app.get('/health', async (_request, reply) => {
    try {
      const { rows } = await pool.query<{ now: string }>('select now()::text as now');
      return { status: 'ok', time: rows[0]?.now };
    } catch (error) {
      reply.code(503);
      return {
        error: { code: 'database_unavailable', message: (error as Error).message },
      };
    }
  });

  /*
   * One place that renders a failure, so the envelope in docs/api.md cannot
   * drift between endpoints. Anything that is not an ApiError is a bug: it is
   * logged in full and reported as a bare 500, because its message may contain
   * details a caller should not see.
   */
  app.setErrorHandler((error: Error & { validation?: unknown }, request, reply) => {
    if (error instanceof ApiError) {
      reply.code(error.status);
      return {
        error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
      };
    }

    // Fastify raises these for a body that fails its JSON Schema.
    if (error.validation) {
      reply.code(422);
      return {
        error: { code: 'validation_failed', message: error.message },
      };
    }

    request.log.error({ err: error }, 'unhandled error');
    reply.code(500);
    return { error: { code: 'internal', message: 'Something went wrong.' } };
  });

  app.register(authRoutes);

  return app;
}
