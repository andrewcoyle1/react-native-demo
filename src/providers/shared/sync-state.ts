/**
 * The live read, with a cache in front of it and a retry behind it.
 *
 * A port of what `DocumentSyncEngine` and `CollectionSyncEngine` do in
 * SwiftfulDataManagers, reshaped for this codebase. Three behaviours come
 * across; the fourth deliberately does not.
 *
 *   Cache first, then revalidate. A cached copy is delivered immediately on
 *   mount, so returning to a screen shows last week's plan rather than a
 *   spinner, and the fetch replaces it when it lands.
 *
 *   Retry with exponential backoff, 2s doubling to 60s, reset on success. A
 *   read that fails because a phone left a tunnel should recover on its own.
 *
 *   `stale`, so a screen can say what it is showing. The Swift engine
 *   distinguishes "from cache" from "fetched"; this carries the same fact.
 *
 * What does not come across is streaming. Those engines start a listener and
 * apply individual add/update/delete events. This app fetches for now — see
 * `docs/streaming.md` — and the shape below is unchanged when that lands,
 * because `onData` may already fire many times.
 *
 * `SyncState` is a superset of `RemoteState`: a consumer that only understands
 * loading, error and ready keeps working untouched.
 */
import { useEffect, useRef, useState } from 'react';

import { readCache, writeCache } from './persistence';
import type { Subscribe } from './remote-state';

import { reportError } from '@/services/telemetry';

export type SyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      data: T;
      /** True while this came from the cache and the network has not answered. */
      stale: boolean;
    };

/** First retry delay, doubling from here. */
const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 60_000;

export type SyncOptions<T> = {
  /** Passed to `reportError`, by the '<feature>: <operation>' convention. */
  context: string;
  /**
   * Where to cache, and how to restore what JSON lost.
   *
   * Omit it entirely for data not worth persisting. `revive` exists because a
   * `Date` survives `JSON.stringify` as a string and must be rebuilt — only the
   * caller knows which fields were dates.
   */
  cache?: {
    /** Combined with the key, so two windows do not share a file. */
    name: string;
    revive: (raw: unknown) => T;
  };
};

/**
 * Subscribes while `key` is non-null, hydrating from cache and retrying on
 * failure.
 *
 * As with `useRemoteSubscription`, `key` must encode everything the read varies
 * by, and `subscribe` must be stable — wrap it in `useCallback`.
 */
export function useSyncedSubscription<T>(
  key: string | null,
  subscribe: Subscribe<T>,
  options: SyncOptions<T>,
): SyncState<T> | null {
  const [state, setState] = useState<SyncState<T>>({ status: 'loading' });
  const [subscribedKey, setSubscribedKey] = useState(key);

  // Reset during render, so the previous key's data never shows under the new
  // one. Same reasoning as `useRemoteSubscription`.
  if (key !== subscribedKey) {
    setSubscribedKey(key);
    setState({ status: 'loading' });
  }

  const { context, cache } = options;
  const cacheName = cache?.name;
  const revive = cache?.revive;

  /** Grows while a read keeps failing; reset the moment one succeeds. */
  const backoff = useRef(RETRY_BASE_MS);

  useEffect(() => {
    if (key === null) {
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const cacheKey = cacheName ? `${cacheName}.${key}` : null;

    /** Deliver whatever was cached, but never over data already fetched. */
    const hydrate = async () => {
      if (!cacheKey || !revive) {
        return;
      }

      const raw = await readCache(cacheKey);
      if (cancelled || raw === null) {
        return;
      }

      setState(current =>
        current.status === 'ready'
          ? current
          : { status: 'ready', data: revive(raw), stale: true },
      );
    };

    const start = () => {
      unsubscribe = subscribe(
        key,
        data => {
          if (cancelled) {
            return;
          }
          backoff.current = RETRY_BASE_MS;
          setState({ status: 'ready', data, stale: false });
          if (cacheKey) {
            void writeCache(cacheKey, data);
          }
        },
        error => {
          if (cancelled) {
            return;
          }
          reportError(error, context);

          /*
           * A cached copy outranks an error message: the athlete would rather
           * see last week's plan marked stale than a failure they cannot act
           * on. Only report the error when there is nothing to show.
           */
          setState(current =>
            current.status === 'ready' ? current : { status: 'error', message: error.message },
          );

          const delay = backoff.current;
          backoff.current = Math.min(delay * 2, RETRY_MAX_MS);

          retry = setTimeout(() => {
            unsubscribe?.();
            start();
          }, delay);
        },
      );
    };

    void hydrate();
    start();

    return () => {
      cancelled = true;
      clearTimeout(retry);
      unsubscribe?.();
    };
  }, [key, subscribe, context, cacheName, revive]);

  if (key === null) {
    return null;
  }

  return state;
}
