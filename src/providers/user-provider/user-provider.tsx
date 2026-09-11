/**
 * User provider — the "manager" layer for the profile feature.
 *
 * Owns the live subscription to the signed-in user's profile and exposes it as a
 * single `UserState` union, so screens never have to reconcile separate
 * loading / error / missing-profile flags.
 *
 * The subscription mechanics live in `useRemoteSubscription`; what is left here
 * is the one thing particular to profiles — that a document which does not exist
 * is `absent` rather than an error, and is never written on the athlete's behalf.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { firebaseUserService } from './services/firebase-user-service';
import type { UserDraft, UserModel, UserService, UserState } from './services/user-service';

import { useAuth } from '@/providers/auth-provider';
import { useRemoteSubscription } from '@/providers/shared/remote-state';
import type { Subscribe } from '@/providers/shared/remote-state';
import { breadcrumb } from '@/services/telemetry';

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

  /*
   * Bumped after `create`/`update` so the subscription key changes and
   * `useRemoteSubscription` restarts its effect. `apiUserService.subscribe` is
   * a one-shot fetch (see `docs/streaming.md`; there is no live profile stream
   * yet), so nothing else re-reads it — and the root gate depends on `absent`
   * flipping to `ready` the moment onboarding finishes, not on the athlete's
   * next cold start.
   */
  const [profileEpoch, setProfileEpoch] = useState(0);
  const key = uid ? `${uid}:${profileEpoch}` : null;

  // Memoised so the subscription survives a re-render: `useRemoteSubscription`
  // treats this as a real dependency.
  const subscribe = useCallback<Subscribe<UserModel | null>>(
    (subscribeKey, onData, onError) => {
      const subscribeUid = subscribeKey.split(':')[0]!;
      return service.subscribe(
        subscribeUid,
        profile => {
          breadcrumb(
            profile ? `user: profile ready (${subscribeUid})` : `user: profile absent (${subscribeUid})`,
          );
          onData(profile);
        },
        onError,
      );
    },
    [service],
  );

  const remote = useRemoteSubscription(key, subscribe, 'user: subscription');

  const create = useCallback(
    async (draft: UserDraft) => {
      if (uid) {
        await service.create(uid, draft);
        setProfileEpoch(epoch => epoch + 1);
      }
    },
    [uid, service],
  );

  const update = useCallback(
    async (changes: Partial<UserDraft>) => {
      if (uid) {
        await service.update(uid, changes);
        setProfileEpoch(epoch => epoch + 1);
      }
    },
    [uid, service],
  );

  const value = useMemo<UserContextValue>(() => {
    // Derived rather than stored, so signedOut can never disagree with `uid`.
    // A null document is the profile-shaped case the hook cannot know about:
    // the athlete exists in auth but has not been through profile setup.
    const state: UserState = !remote
      ? { status: 'signedOut' }
      : remote.status === 'ready'
        ? remote.data
          ? { status: 'ready', user: remote.data }
          : { status: 'absent' }
        : remote;

    return { state, create, update };
  }, [remote, create, update]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const value = useContext(UserContext);
  if (!value) {
    throw new Error('useUser must be used inside <UserProvider>');
  }
  return value;
}
