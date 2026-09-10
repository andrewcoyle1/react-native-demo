/**
 * The live-read shape, factored out of the feature providers.
 *
 * `user-provider` and `notes-provider` each hand-rolled the same subscription
 * idiom — reset during render, subscribe in an effect, map the error branch
 * through `reportError`. Four more slices would have copied it four more times,
 * so it lives here once and every provider above it is left owning only its own
 * domain.
 */
import { useEffect, useState } from 'react';

import { reportError } from '@/services/telemetry';

/**
 * What a bounded live read can be at any moment.
 *
 * Deliberately without a `signedOut` member: whether there is a user is a fact
 * about auth, not about this subscription, so the providers derive it from the
 * uid rather than storing it. `useRemoteSubscription` returns `null` when there
 * is no key, which is the hook's way of saying "not subscribed to anything".
 */
export type RemoteState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

/**
 * Starts a subscription and reports what it has delivered so far.
 *
 * The key is handed back so a caller can subscribe without asserting that the
 * uid it closed over is non-null — the hook only calls this while it has one.
 */
export type Subscribe<T> = (
  key: string,
  onData: (data: T) => void,
  onError: (error: Error) => void,
) => () => void;

/**
 * Subscribes while `key` is non-null, resubscribing whenever it changes.
 *
 * `key` must encode everything the subscription varies by — the uid, and for a
 * windowed read the window too — so that a change of window tears the old
 * listener down.
 *
 * `subscribe` must be stable: wrap it in `useCallback` at the call site, or the
 * effect will tear the subscription down on every render. It is a real
 * dependency rather than a ref because the React Compiler's lint rules forbid
 * writing a ref during render, and hiding it would only move the footgun.
 *
 * @param context Passed to `reportError`, by the repo's '<feature>: <operation>'
 *   convention — 'sessions: subscription'.
 */
export function useRemoteSubscription<T>(
  key: string | null,
  subscribe: Subscribe<T>,
  context: string,
): RemoteState<T> | null {
  /** Whatever the listener has delivered so far; null means "nothing yet". */
  const [loaded, setLoaded] = useState<Exclude<RemoteState<T>, { status: 'loading' }> | null>(null);
  const [subscribedKey, setSubscribedKey] = useState(key);

  // Adjusting state during render is React's sanctioned way to reset when an
  // input changes. It avoids the extra commit an effect would cause, and stops
  // the previous key's data showing before the new listener delivers.
  if (key !== subscribedKey) {
    setSubscribedKey(key);
    setLoaded(null);
  }

  useEffect(() => {
    if (key === null) {
      return;
    }
    return subscribe(
      key,
      data => setLoaded({ status: 'ready', data }),
      error => {
        setLoaded({ status: 'error', message: error.message });
        reportError(error, context);
      },
    );
  }, [key, subscribe, context]);

  if (key === null) {
    return null;
  }

  return loaded ?? { status: 'loading' };
}
