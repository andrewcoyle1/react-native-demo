/**
 * Writes that outlive the network.
 *
 * The last piece of SwiftfulDataManagers to port: its engines keep a pending
 * writes queue beside the cache, and retry it when a listener next starts. The
 * case that motivates it here is exact — marking a session complete at a pool,
 * on a phone with no signal. Without this the tick simply fails.
 *
 * Three rules make it safe:
 *
 *   **Only network failures queue.** A request the server *rejected* — a 4xx —
 *   is a decision, not an outage, and replaying it forever would never succeed.
 *
 *   **Keys collapse duplicates.** Completing the same session twice while
 *   offline should send one write, not two, so an entry replaces any earlier
 *   one with the same key.
 *
 *   **Replay must be harmless.** Every queued write is a PUT or a PATCH
 *   carrying the whole desired state, so applying it twice lands in the same
 *   place. That is why there is no idempotency-key table on the server: the
 *   writes are idempotent by construction rather than by bookkeeping.
 */
import { readCache, writeCache } from './persistence';

import { ApiError, request } from '@/services/api/client';
import { breadcrumb, reportError } from '@/services/telemetry';

const QUEUE_KEY = 'pending-writes';

export type PendingWrite = {
  /** Collapses duplicates: `session-completion:<id>`. */
  key: string;
  method: 'POST' | 'PUT' | 'PATCH';
  path: string;
  body: unknown;
  queuedAt: number;
};

/**
 * Old enough that replaying it would be surprising rather than helpful.
 *
 * A completion queued three weeks ago, applied now, would stamp itself with
 * today — so past this age the entry is dropped instead.
 */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let queue: PendingWrite[] | null = null;
let flushing: Promise<void> | null = null;

async function load(): Promise<PendingWrite[]> {
  queue ??= ((await readCache(QUEUE_KEY)) as PendingWrite[] | null) ?? [];
  return queue;
}

async function save(next: PendingWrite[]): Promise<void> {
  queue = next;
  await writeCache(QUEUE_KEY, next);
}

/**
 * Sends a write, queueing it if the network is unreachable.
 *
 * Resolves either way: the caller's job is to record what the athlete asked
 * for, and a queued write is a promise that it will happen, not a failure.
 * A rejection from the server still throws, because that is a real answer.
 */
export async function queuedWrite<T>(
  key: string,
  method: PendingWrite['method'],
  path: string,
  body: unknown,
): Promise<T | null> {
  try {
    const result = await request<T>(method, path, { body });
    // A successful write is a working network, so anything waiting can go now.
    void flushPendingWrites();
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const pending = await load();
    await save([
      ...pending.filter(entry => entry.key !== key),
      { key, method, path, body, queuedAt: Date.now() },
    ]);

    breadcrumb(`pending: queued ${key}`);
    return null;
  }
}

/**
 * Replays everything queued, oldest first.
 *
 * Order matters: two writes to the same document would otherwise land in the
 * wrong sequence. It stops at the first network failure rather than working
 * through the rest, because the network is the thing that failed.
 */
export async function flushPendingWrites(): Promise<void> {
  flushing ??= (async () => {
    const pending = await load();
    if (pending.length === 0) {
      return;
    }

    const remaining: PendingWrite[] = [];

    for (let index = 0; index < pending.length; index += 1) {
      const entry = pending[index]!;

      if (Date.now() - entry.queuedAt > MAX_AGE_MS) {
        breadcrumb(`pending: dropped ${entry.key}, too old`);
        continue;
      }

      try {
        await request(entry.method, entry.path, { body: entry.body });
        breadcrumb(`pending: sent ${entry.key}`);
      } catch (error) {
        if (error instanceof ApiError) {
          // The server answered, and its answer was no. Retrying cannot change
          // that, so the entry is dropped and the failure recorded.
          reportError(error, `pending: rejected ${entry.key}`);
          continue;
        }

        // Still offline. Keep this and everything after it, in order.
        remaining.push(...pending.slice(index));
        break;
      }
    }

    await save(remaining);
  })().finally(() => {
    flushing = null;
  });

  return flushing;
}

/** Whether anything is waiting, so a screen can say so. */
export async function pendingWriteCount(): Promise<number> {
  return (await load()).length;
}
