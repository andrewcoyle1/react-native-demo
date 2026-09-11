/**
 * The auth endpoints, as specified in `docs/api.md`.
 *
 * Validation is Fastify's built-in JSON Schema rather than a hand-written
 * check: it rejects a malformed body before any handler runs, and it is the one
 * place a request shape is stated.
 */
import type { FastifyInstance } from 'fastify';

import { notFound } from '../errors.ts';
import { authenticate } from '../plugins/authenticate.ts';
import { authRateLimit } from '../plugins/rate-limit.ts';
import { PASSWORD_MAX, PASSWORD_MIN } from './password.ts';
import * as auth from './service.ts';

const email = { type: 'string', format: 'email', maxLength: 320 } as const;
const password = { type: 'string', minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX } as const;
const refreshToken = { type: 'string', minLength: 1, maxLength: 512 } as const;

export async function authRoutes(
  app: FastifyInstance,
  options: { rateLimit?: { authMax?: number } } = {},
): Promise<void> {
  /*
   * The tight budget, applied to every endpoint that takes a credential.
   * Sign-out is left on the global limit: it destroys a session rather than
   * granting one, so there is nothing to gain by repeating it.
   */
  const limited = authRateLimit(options.rateLimit);

  app.post(
    '/v1/auth/sign-up',
    {
      config: limited,
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'timezone'],
          additionalProperties: false,
          properties: {
            email,
            password,
            // An IANA zone. The server cannot decide what day it is for this
            // athlete without one, so sign-up is where it must arrive.
            timezone: { type: 'string', minLength: 1, maxLength: 64 },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { email: string; password: string; timezone: string };
      reply.code(201);
      return auth.signUp(body);
    },
  );

  app.post(
    '/v1/auth/sign-in',
    {
      config: limited,
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          additionalProperties: false,
          // Not the sign-up constraints: an old password may be shorter than
          // today's minimum, and rejecting it here would lock that account out.
          properties: { email, password: { type: 'string', minLength: 1, maxLength: PASSWORD_MAX } },
        },
      },
    },
    async request => auth.signIn(request.body as { email: string; password: string }),
  );

  app.post(
    '/v1/auth/refresh',
    {
      config: limited,
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          additionalProperties: false,
          properties: { refreshToken },
        },
      },
    },
    async request => auth.refresh((request.body as { refreshToken: string }).refreshToken),
  );

  app.post(
    '/v1/auth/sign-out',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          additionalProperties: false,
          properties: { refreshToken },
        },
      },
    },
    async (request, reply) => {
      await auth.signOut((request.body as { refreshToken: string }).refreshToken);
      reply.code(204);
    },
  );

  app.get('/v1/auth/me', { preHandler: authenticate }, async request => {
    const user = await auth.currentUser(request.userId!);

    if (!user) {
      // The token verified but the account is gone — deleted since it was
      // issued. Not a 401: the credential was fine.
      throw notFound('user_not_found', 'That account no longer exists.');
    }

    return user;
  });

  app.delete(
    '/v1/auth/me',
    // The global limit, not `limited`: this takes no credential of its own to
    // attempt, only an access token the caller already had to have earned.
    { preHandler: authenticate },
    async (request, reply) => {
      await auth.deleteAccount(request.userId!);
      reply.code(204);
    },
  );
}
