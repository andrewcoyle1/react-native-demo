/**
 * `/v1/profile`, as specified in `docs/api.md`.
 *
 * There is no `userId` anywhere in these paths. The id comes from the access
 * token, so a request structurally cannot reach another athlete's profile —
 * which removes the whole class of bug where an ownership check is forgotten.
 */
import type { FastifyInstance } from 'fastify';

import { authenticate } from '../plugins/authenticate.ts';
import * as profile from './service.ts';

const name = { type: 'string', minLength: 1, maxLength: 100 } as const;
const dateOfBirth = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } as const;
const sex = { type: 'string', enum: ['male', 'female', 'other'] } as const;
const units = { type: 'string', enum: ['metric', 'imperial'] } as const;
const timezone = { type: 'string', minLength: 1, maxLength: 64 } as const;

/*
 * Metrics accept null as well as a number: null is how the Clear button on the
 * pace and FTP pickers says "I no longer know this figure". An omitted key,
 * by contrast, leaves the column alone — see `patchMetrics`.
 */
const nullableInt = (minimum: number, maximum: number) =>
  ({ type: ['integer', 'null'], minimum, maximum }) as const;
const nullableNumber = (minimum: number, maximum: number) =>
  ({ type: ['number', 'null'], minimum, maximum, exclusiveMinimum: 0 }) as const;

/* Bounds mirror the check constraints on `athlete_metrics`, so a bad figure is
   refused with a 400 here rather than a 500 from the database. */
const metricsProperties = {
  heightCm: nullableInt(50, 250),
  weightKg: nullableNumber(20, 300),
  heartRateMin: nullableInt(20, 250),
  heartRateMax: nullableInt(20, 250),
  cyclingFtp: nullableInt(20, 700),
  runPaceSecondsPerKm: nullableNumber(1, 3600),
  swimPaceSecondsPer100m: nullableNumber(1, 3600),
} as const;

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/profile', { preHandler: authenticate }, async request =>
    profile.readProfile(request.userId!),
  );

  app.post(
    '/v1/profile',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['name', 'dateOfBirth', 'sex', 'timezone'],
          additionalProperties: false,
          // `units` is the only optional field: the column has a default, and
          // an athlete who never chooses gets metric.
          properties: { name, dateOfBirth, sex, timezone, units },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Omit<profile.ProfileDraft, 'units'> &
        Partial<Pick<profile.ProfileDraft, 'units'>>;
      reply.code(201);
      // Explicit rather than a spread over a default: an absent key and a key
      // set to undefined would behave differently, and only one of those is
      // what the schema means.
      return profile.createProfile(request.userId!, { ...body, units: body.units ?? 'metric' });
    },
  );

  app.patch(
    '/v1/profile',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: { name, dateOfBirth, sex, timezone, units },
        },
      },
    },
    async request =>
      profile.updateProfile(request.userId!, request.body as Partial<profile.ProfileDraft>),
  );

  app.get('/v1/profile/metrics', { preHandler: authenticate }, async request =>
    profile.readMetrics(request.userId!),
  );

  app.patch(
    '/v1/profile/metrics',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: metricsProperties,
        },
      },
    },
    async request =>
      profile.updateMetrics(
        request.userId!,
        request.body as profile.MetricsChanges,
      ),
  );
}
