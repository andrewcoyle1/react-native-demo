/**
 * The paged-read shape.
 *
 * The counterpart to `useRemoteSubscription`: where that one holds a listener
 * open over a bounded window, this one walks a collection that has no bound —
 * an athlete's activity history — a page at a time, and never subscribes to it.
 *
 * The cursor is an opaque string. Firestore's own cursor is a
 * `DocumentSnapshot`, which must not cross the service seam, so each
 * implementation encodes its ordering value into a token instead and this layer
 * only ever passes it back.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { reportError } from '@/services/telemetry';

/** One page of results. A null cursor means there is nothing after this page. */
export type Page<T> = { items: T[]; cursor: string | null };

/**
 * Fetches the page following `cursor`; null asks for the first page.
 *
 * The key is handed back so a caller can read without asserting that the uid it
 * closed over is non-null — the hook only calls this while it has one.
 */
export type List<T> = (key: string, cursor: string | null) => Promise<Page<T>>;

export type PagedState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      items: T[];
      /** A further page is being fetched; the items already shown stay put. */
      loadingMore: boolean;
      /** Every page has been read. `loadMore` is a no-op from here. */
      atEnd: boolean;
    };

export type PagedCollection<T> = {
  /** Null while there is no key — no user, so nothing to page through. */
  state: PagedState<T> | null;
  /** Appends the next page. Ignored while one is in flight or at the end. */
  loadMore: () => void;
  /** Discards every page and re-reads from the top. */
  refresh: () => void;
};

/** What the hook holds internally: `PagedState` plus the cursor it is up to. */
type Internal<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: T[]; cursor: string | null; loadingMore: boolean };

/**
 * Pages through a collection while `key` is non-null, resetting when it changes.
 *
 * As with `useRemoteSubscription`, `key` must encode everything the read varies
 * by, and `list` must be stable — wrap it in `useCallback` at the call site.
 */
export function usePagedCollection<T>(
  key: string | null,
  list: List<T>,
  context: string,
): PagedCollection<T> {
  const [internal, setInternal] = useState<Internal<T>>({ status: 'loading' });
  const [loadedKey, setLoadedKey] = useState(key);
  const [attempt, setAttempt] = useState(0);

  // Reset during render, so the previous key's items never show under the new
  // one. Same reasoning as `useRemoteSubscription`.
  if (key !== loadedKey) {
    setLoadedKey(key);
    setInternal({ status: 'loading' });
  }

  /**
   * Bumped whenever the collection is re-read from the top. An in-flight
   * `loadMore` compares against it on resolution and drops its page if the run
   * it belonged to has been superseded — otherwise a slow page from the previous
   * athlete could append itself to the new one's list.
   *
   * Only ever written from an effect or an event handler, never during render.
   */
  const run = useRef(0);

  /**
   * Set synchronously by `loadMore`, so that a list firing `onEndReached` twice
   * in one frame cannot start two requests. `loadingMore` in state drives the
   * spinner but lands a render too late to guard on.
   */
  const inFlight = useRef(false);

  useEffect(() => {
    if (key === null) {
      return;
    }

    run.current += 1;
    inFlight.current = false;
    const thisRun = run.current;

    list(key, null)
      .then(page => {
        if (run.current !== thisRun) {
          return;
        }
        setInternal({ status: 'ready', items: page.items, cursor: page.cursor, loadingMore: false });
      })
      .catch((error: Error) => {
        if (run.current !== thisRun) {
          return;
        }
        setInternal({ status: 'error', message: error.message });
        reportError(error, context);
      });
  }, [key, attempt, list, context]);

  const loadMore = useCallback(() => {
    if (key === null || internal.status !== 'ready' || internal.cursor === null) {
      return;
    }
    if (inFlight.current) {
      return;
    }

    inFlight.current = true;
    const thisRun = run.current;
    const cursor = internal.cursor;

    setInternal({ ...internal, loadingMore: true });

    list(key, cursor)
      .then(page => {
        if (run.current !== thisRun) {
          return;
        }
        inFlight.current = false;
        setInternal(previous =>
          previous.status === 'ready'
            ? {
                status: 'ready',
                items: [...previous.items, ...page.items],
                cursor: page.cursor,
                loadingMore: false,
              }
            : previous,
        );
      })
      .catch((error: Error) => {
        if (run.current !== thisRun) {
          return;
        }
        inFlight.current = false;
        // A failed page leaves what is already shown alone: the athlete keeps
        // their history and can try the bottom of the list again.
        setInternal(previous =>
          previous.status === 'ready' ? { ...previous, loadingMore: false } : previous,
        );
        reportError(error, context);
      });
  }, [key, internal, list, context]);

  const refresh = useCallback(() => setAttempt(value => value + 1), []);

  if (key === null) {
    return { state: null, loadMore, refresh };
  }

  const state: PagedState<T> =
    internal.status === 'ready'
      ? {
          status: 'ready',
          items: internal.items,
          loadingMore: internal.loadingMore,
          atEnd: internal.cursor === null,
        }
      : internal;

  return { state, loadMore, refresh };
}
