/**
 * The Fastify application, built but not listening.
 *
 * Separated from `index.ts` so tests can build an app and call it through
 * `inject()` — no port, no sockets, no teardown races.
 */
import Fastify, { type FastifyInstance } from 'fastify';

import { authRoutes } from './auth/routes.ts';
import { pool } from './db.ts';
import { config } from './config.ts';
import { ApiError } from './errors.ts';
import { registerRateLimit } from './plugins/rate-limit.ts';
import { profileRoutes } from './profile/routes.ts';
import { activityRoutes } from './activities/routes.ts';
import { sessionRoutes } from './sessions/routes.ts';
import { trainingRoutes } from './training/routes.ts';
import { trendRoutes } from './trends/routes.ts';

export type AppOptions = {
  /** Tighten the limits so a test can actually reach them. */
  rateLimit?: { max?: number; authMax?: number };
};

/**
 * Async because rate limiting is a plugin and plugins register asynchronously.
 * Callers `await buildApp()`; tests then `await app.ready()` as before.
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    // Without this, `request.ip` behind a proxy is the proxy — so every user
    // would share one rate-limit budget. See config.ts for why it is off by
    // default.
    trustProxy: config.trustProxy,
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
  app.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
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

    /*
     * Fastify and its plugins raise errors carrying their own status — the rate
     * limiter's 429 chief among them. Those are answers, not faults, and
     * flattening them to a 500 loses both the status and the meaning.
     */
    const status = error.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      reply.code(status);
      const retryAfter = reply.getHeader('retry-after');
      return {
        error: {
          code: status === 429 ? 'rate_limited' : 'invalid_request',
          message:
            status === 429
              ? `Too many attempts. Try again${retryAfter ? ` in ${retryAfter}s` : ' shortly'}.`
              : error.message,
        },
      };
    }

    request.log.error({ err: error }, 'unhandled error');
    reply.code(500);
    return { error: { code: 'internal', message: 'Something went wrong.' } };
  });

  /*
   * Fastify answers an unknown route itself, before the error handler above
   * ever runs, and its default body is a different shape from every other
   * failure this API returns. A client parsing `error.code` would find nothing.
   */
  app.setNotFoundHandler((request, reply) => {
    reply.code(404);
    return {
      error: {
        code: 'route_not_found',
        message: `No route for ${request.method} ${request.url}.`,
      },
    };
  });

  await registerRateLimit(app, options.rateLimit);

  app.register(authRoutes, { rateLimit: options.rateLimit });
  app.register(profileRoutes);
  app.register(trainingRoutes);
  app.register(sessionRoutes);
  app.register(activityRoutes);
  app.register(trendRoutes);

  return app;
}
