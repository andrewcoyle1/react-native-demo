/**
 * The API converter must survive a server that predates a field.
 *
 * A real incident sits behind this. The detail sheet added `bands`, `sets`,
 * `intensity`, `estimateBasis` and `connections` to the session contract, and
 * the converter dereferenced them — `dto.connections.map(...)`. The deployed
 * API had none of those columns and omitted the fields entirely, so every
 * session read threw "Cannot read property 'map' of undefined" and the
 * dashboard showed "Your plan could not be loaded" to anyone on a new account.
 *
 * Client and server deploy independently. A field added to `wire.ts` is
 * therefore absent in production until the server ships, and absorbing that is
 * this converter's whole job.
 */
/* eslint-disable import/first -- the mocks below must be registered before the
   service is imported, or it captures the real API client. */
import type { SessionModel } from '@/providers/sessions-provider';

const mockGet = jest.fn();

/*
 * The factory forwards rather than closing over `mockGet` directly: Babel
 * hoists the imports above the `const`, so the module is required — and this
 * factory run — while `mockGet` is still undefined. Calling through defers the
 * lookup to when the request is actually made.
 */
jest.mock('@/services/api/client', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}));
jest.mock('@/providers/shared/pending-writes', () => ({ queuedWrite: jest.fn() }));

import { apiSessionsService } from '@/providers/sessions-provider/services/api-sessions-service';

/** Exactly what the API sent before the detail sheet existed. */
const LEGACY_SESSION = {
  id: 'run-1',
  date: '2026-09-14',
  order: 0,
  title: '35 min Easy Run',
  discipline: 'run',
  purpose: 'recovery',
  focus: [],
  equipment: [],
  descriptor: 'Easy run',
  targets: { durationSeconds: 2100, estimated: true },
  segments: [],
  chartSeconds: 2100,
  tickEveryMinutes: null,
  completion: null,
  coachName: null,
  coachNote: null,
};

function read(payload: unknown): Promise<SessionModel[]> {
  mockGet.mockResolvedValueOnce(payload);

  return new Promise((resolve, reject) => {
    apiSessionsService.subscribe(
      'athlete-1',
      { from: '2026-09-14', to: '2026-09-20' },
      resolve,
      reject,
    );
  });
}

beforeEach(() => mockGet.mockReset());

describe('a server that predates the detail sheet', () => {
  it('reads its sessions rather than throwing', async () => {
    const [session] = await read([LEGACY_SESSION]);

    expect(session.title).toBe('35 min Easy Run');
    // Every new field defaults to the model's empty form, so the sheet shows a
    // session with no written-out workout rather than failing to open.
    expect(session.bands).toEqual([]);
    expect(session.sets).toEqual([]);
    expect(session.connections).toEqual([]);
    expect(session.intensity).toBeNull();
    expect(session.estimateBasis).toBeNull();
  });

  it('still reads a server that does send them', async () => {
    const [session] = await read([
      {
        ...LEGACY_SESSION,
        intensity: 'low',
        estimateBasis: 'your run threshold pace of 4:30/km',
        bands: [{ kind: 'main', startSeconds: 0, durationSeconds: 2100 }],
        sets: [{ id: 'main', kind: 'main', title: null, steps: [] }],
        connections: [{ kind: 'garmin', syncedAt: '2026-09-13T17:04:00.000Z' }],
      },
    ]);

    expect(session.intensity).toBe('low');
    expect(session.bands).toHaveLength(1);
    expect(session.sets).toHaveLength(1);
    // The one field JSON cannot carry: a sync stamp arrives as a string.
    expect(session.connections[0].syncedAt).toBeInstanceOf(Date);
  });
});
