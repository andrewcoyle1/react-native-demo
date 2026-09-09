/**
 * In-memory `UserService` for the mock environment.
 *
 * Every uid gets a seeded profile except the anonymous one, which starts with no
 * document at all. That makes both listener branches reachable without a
 * backend: sign in with an email for `ready`, continue anonymously for `absent`.
 */
import type { UserDraft, UserModel, UserService } from './user-service';

/** The uid `mockAuthService` assigns to anonymous sign-in. */
const ANONYMOUS_UID = 'mock-anonymous';

type Listener = (user: UserModel | null) => void;

const store = new Map<string, UserModel>();
const listeners = new Map<string, Set<Listener>>();
/** Uids whose seed has already been considered, so a profile is never re-seeded. */
const seeded = new Set<string>();

function seed(uid: string): UserModel | null {
  if (uid === ANONYMOUS_UID) {
    return null;
  }
  const now = new Date();
  return {
    id: uid,
    name: 'Sam Rivera',
    dateOfBirth: new Date('1990-05-14T00:00:00.000Z'),
    sex: 'other',
    createdAt: new Date(now.getTime() - 86_400_000),
    modifiedAt: new Date(now.getTime() - 86_400_000),
  };
}

function profileFor(uid: string): UserModel | null {
  if (!seeded.has(uid)) {
    seeded.add(uid);
    const initial = seed(uid);
    if (initial) {
      store.set(uid, initial);
    }
  }
  return store.get(uid) ?? null;
}

function emit(uid: string) {
  const snapshot = profileFor(uid);
  listeners.get(uid)?.forEach(listener => listener(snapshot));
}

/** Mirrors the async shape of a real write so loading states still show. */
function settle(work: () => void): Promise<void> {
  return new Promise(resolve =>
    setTimeout(() => {
      work();
      resolve();
    }, 150),
  );
}

function write(uid: string, draft: UserDraft, existing: UserModel | null): UserModel {
  const now = new Date();
  return {
    id: uid,
    name: draft.name.trim(),
    dateOfBirth: draft.dateOfBirth,
    sex: draft.sex,
    createdAt: existing?.createdAt ?? now,
    modifiedAt: now,
  };
}

export const mockUserService: UserService = {
  subscribe(uid, onUser) {
    const forUid = listeners.get(uid) ?? new Set<Listener>();
    forUid.add(onUser);
    listeners.set(uid, forUid);

    // Deliver asynchronously, matching Firestore's first-snapshot behaviour.
    const timer = setTimeout(() => onUser(profileFor(uid)), 0);

    return () => {
      clearTimeout(timer);
      forUid.delete(onUser);
    };
  },

  create(uid, draft) {
    return settle(() => {
      store.set(uid, write(uid, draft, null));
      seeded.add(uid);
      emit(uid);
    });
  },

  update(uid, changes) {
    return settle(() => {
      const existing = profileFor(uid);
      if (!existing) {
        return;
      }
      store.set(uid, write(uid, { ...existing, ...changes }, existing));
      emit(uid);
    });
  },
};
