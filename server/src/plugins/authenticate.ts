/**
 * Bearer authentication.
 *
 * Verifies the access token's signature and expiry and puts the user id on the
 * request. It deliberately does not read the database: that is what makes a
 * signed token cheap enough to check on every request, and why the token
 * carries nothing that can change.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import { unauthorized } from '../errors.ts';
import { readAccessToken } from '../auth/tokens.ts';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `authenticate`. Present only on routes that use it. */
    userId?: string;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw unauthorized('token_missing', 'Authorization: Bearer <token> is required.');
  }

  const userId = await readAccessToken(header.slice('Bearer '.length));

  if (!userId) {
    // One code for every failure — expired, forged, malformed. Telling a caller
    // which would help them work out what to try next.
    throw unauthorized('token_invalid', 'That access token is not valid.');
  }

  request.userId = userId;
}
