/**
 * `POST /v1/onboarding/complete`, as specified in `docs/api.md`.
 *
 * One call, so the client cannot leave the athlete half-saved by a screen
 * that reloads between two separate requests.
 */
import type { FastifyInstance } from 'fastify';

import { authenticate } from '../plugins/authenticate.ts';
import { completeOnboarding } from './service.ts';

const name = { type: 'string', minLength: 1, maxLength: 100 } as const;
const dateOfBirth = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } as const;
const sex = { type: 'string', enum: ['male', 'female', 'other'] } as const;
const units = { type: 'string', enum: ['metric', 'imperial'] } as const;
const timezone = { type: 'string', minLength: 1, maxLength: 64 } as const;
const discipline = { type: 'string', enum: ['swim', 'run', 'ride', 'weights'] } as const;
const positiveNumber = { type: 'number', exclusiveMinimum: 0 } as const;

const metrics = {
  type: 'object',
  additionalProperties: false,
  properties: {
    heightCm: positiveNumber,
    weightKg: positiveNumber,
    heartRateMin: positiveNumber,
    heartRateMax: positiveNumber,
    cyclingFtp: positiveNumber,
    runPaceSecondsPerKm: positiveNumber,
    swimPaceSecondsPer100m: positiveNumber,
  },
} as const;

const commitment = {
  type: 'object',
  required: ['label', 'weekday'],
  additionalProperties: false,
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 100 },
    weekday: { type: 'integer', minimum: 0, maximum: 6 },
    discipline: { anyOf: [discipline, { type: 'null' }] },
  },
} as const;

const schedule = {
  type: 'object',
  required: ['availableMinutes', 'commitments'],
  additionalProperties: false,
  properties: {
    availableMinutes: { type: 'array', minItems: 7, maxItems: 7, items: { type: 'integer', minimum: 0 } },
    commitments: { type: 'array', items: commitment },
  },
} as const;

const raceLeg = {
  type: 'object',
  required: ['discipline', 'distanceMetres'],
  additionalProperties: false,
  properties: { discipline, distanceMetres: positiveNumber },
} as const;

/**
 * Exported so `POST /v1/plans` validates a race exactly as onboarding does.
 * Two copies of a validation schema is two copies to keep agreeing, and the
 * one that drifts is the one nobody is looking at.
 */
export const race = {
  type: 'object',
  required: ['name', 'place', 'date', 'priority', 'targetSeconds', 'legs'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 200 },
    place: { type: 'string', maxLength: 200 },
    date: dateOfBirth,
    priority: { type: 'string', enum: ['A', 'B', 'C'] },
    targetSeconds: { anyOf: [{ type: 'integer', exclusiveMinimum: 0 }, { type: 'null' }] },
    legs: { type: 'array', items: raceLeg },
  },
} as const;

export async function onboardingRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/v1/onboarding/complete',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['profile', 'units', 'metrics', 'schedule', 'weeklyHours'],
          additionalProperties: false,
          properties: {
            profile: {
              type: 'object',
              required: ['name', 'dateOfBirth', 'sex', 'timezone'],
              additionalProperties: false,
              properties: { name, dateOfBirth, sex, timezone },
            },
            units,
            metrics,
            schedule,
            race: { anyOf: [race, { type: 'null' }] },
            weeklyHours: positiveNumber,
          },
        },
      },
    },
    async (request, reply) => {
      reply.code(201);
      return completeOnboarding(request.userId!, request.body as Parameters<typeof completeOnboarding>[1]);
    },
  );
}
