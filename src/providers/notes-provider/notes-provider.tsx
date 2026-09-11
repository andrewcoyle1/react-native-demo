/**
 * Notes provider — the "manager" layer for the notes feature.
 *
 * Owns the live subscription for the signed-in user and exposes the list as a
 * single `NotesState` union, so screens never have to reconcile separate
 * loading / error / data flags. The subscription mechanics live in
 * `useRemoteSubscription`.
 */
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { firebaseNotesService } from './services/firebase-notes-service';
import type { Note, NotesService, NotesState } from './services/notes-service';

import { useAuth } from '@/providers/auth-provider';
import { useRemoteSubscription } from '@/providers/shared/remote-state';
import type { Subscribe } from '@/providers/shared/remote-state';

type NotesContextValue = {
  state: NotesState;
  add: (text: string) => Promise<void>;
  remove: (noteId: string) => Promise<void>;
};

const NotesContext = createContext<NotesContextValue | null>(null);

type NotesProviderProps = PropsWithChildren<{
  /** Injected dependency. Defaults to the Firestore implementation. */
  service?: NotesService;
}>;

export function NotesProvider({ children, service = firebaseNotesService }: NotesProviderProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // Memoised so the subscription survives a re-render: `useRemoteSubscription`
  // treats this as a real dependency.
  const subscribe = useCallback<Subscribe<Note[]>>(
    (key, onData, onError) => service.subscribe(key, onData, onError),
    [service],
  );

  const remote = useRemoteSubscription(uid, subscribe, 'notes: subscription');

  const add = useCallback(
    async (text: string) => {
      if (uid) {
        await service.add(uid, text);
      }
    },
    [uid, service],
  );

  const remove = useCallback(
    async (noteId: string) => {
      if (uid) {
        await service.remove(uid, noteId);
      }
    },
    [uid, service],
  );

  const value = useMemo<NotesContextValue>(() => {
    // Derived rather than stored, so signedOut can never disagree with `uid`.
    const state: NotesState = !remote
      ? { status: 'signedOut' }
      : remote.status === 'ready'
        ? { status: 'ready', notes: remote.data }
        : remote;

    return { state, add, remove };
  }, [remote, add, remove]);

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const value = useContext(NotesContext);
  if (!value) {
    throw new Error('useNotes must be used inside <NotesProvider>');
  }
  return value;
}
