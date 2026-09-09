/**
 * User provider — the "manager" layer for the profile feature.
 *
 * Owns the live subscription to the signed-in user's profile and exposes it as a
 * single `UserState` union, so screens never have to reconcile separate
 * loading / error / missing-profile flags.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { firebaseUserService } from './services/firebase-user-service';
import type { UserDraft, UserService, UserState } from './services/user-service';

import { useAuth } from '@/providers/auth-provider';
import { breadcrumb, reportError } from '@/services/telemetry';

/** The states the listener itself can produce; the rest are derived from `uid`. */
type LoadedState = Extract<
  UserState,
  { status: 'ready' } | { status: 'absent' } | { status: 'error' }
>;

type UserContextValue = {
  state: UserState;
  create: (draft: UserDraft) => Promise<void>;
  update: (changes: Partial<UserDraft>) => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

type UserProviderProps = PropsWithChildren<{
  /** Injected dependency. Defaults to the Firestore implementation. */
  service?: UserService;
}>;

export function UserProvider({ children, service = firebaseUserService }: UserProviderProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  /** Whatever the listener has delivered so far; null means "nothing yet". */
  const [loaded, setLoaded] = useState<LoadedState | null>(null);
  const [subscribedUid, setSubscribedUid] = useState(uid);

  // Adjusting state during render is React's sanctioned way to reset when an
  // input changes. It avoids the extra commit an effect would cause, and stops
  // the previous user's profile showing before the new listener delivers.
  if (uid !== subscribedUid) {
    setSubscribedUid(uid);
    setLoaded(null);
  }

  useEffect(() => {
    if (!uid) {
      return;
    }
    return service.subscribe(
      uid,
      profile => {
        setLoaded(profile ? { status: 'ready', user: profile } : { status: 'absent' });
        breadcrumb(profile ? `user: profile ready (${uid})` : `user: profile absent (${uid})`);
      },
      error => {
        setLoaded({ status: 'error', message: error.message });
        reportError(error, 'user: subscription');
      },
    );
  }, [uid, service]);

  const create = useCallback(
    async (draft: UserDraft) => {
      if (uid) {
        await service.create(uid, draft);
      }
    },
    [uid, service],
  );

  const update = useCallback(
    async (changes: Partial<UserDraft>) => {
      if (uid) {
        await service.update(uid, changes);
      }
    },
    [uid, service],
  );

  const value = useMemo<UserContextValue>(() => {
    // Derived rather than stored, so signedOut / loading can never disagree with `uid`.
    const state: UserState = !uid ? { status: 'signedOut' } : (loaded ?? { status: 'loading' });
    return { state, create, update };
  }, [uid, loaded, create, update]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const value = useContext(UserContext);
  if (!value) {
    throw new Error('useUser must be used inside <UserProvider>');
  }
  return value;
}
