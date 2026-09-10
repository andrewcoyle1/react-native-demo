/**
 * Rate limiting.
 *
 * Two budgets. A generous global one, so a runaway client cannot exhaust the
 * database, and a tight one on the auth endpoints, which are the only place an
 * attacker gains anything by trying repeatedly.
 *
 * Both are in-memory, which is correct for one process and wrong the moment
 * there are two: each would keep its own count and the effective limit would
 * multiply. The plugin takes a Redis store for that, and the day a second
 * instance appears is the day to give it one.
 */
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import { config } from '../config.ts';

export async function registerRateLimit(
  app: FastifyInstance,
  overrides: { max?: number; authMax?: number } = {},
): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: overrides.max ?? config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    /*
     * Keyed by address, for everything.
     *
     * Per-account would be better for signed-in traffic — an office behind one
     * NAT currently shares a budget — but it cannot be done here: this hook
     * runs on `onRequest`, before the preHandler that verifies the token and
     * puts a user id on the request. Doing it properly means decoding the token
     * a second time inside the limiter, which is not worth it while the global
     * budget exists to protect the database rather than an account.
     */
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });
}

/**
 * The per-route config for an unauthenticated auth endpoint.
 *
 * Keyed by address, because there is no account yet to key by — the whole point
 * is that the caller has not proved who they are.
 */
export function authRateLimit(overrides: { authMax?: number } = {}) {
  return {
    rateLimit: {
      max: overrides.authMax ?? config.rateLimit.authMax,
      timeWindow: config.rateLimit.windowMs,
    },
  };
}
