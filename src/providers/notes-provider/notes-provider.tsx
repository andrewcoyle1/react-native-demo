/**
 * Notes provider — the "manager" layer for the notes feature.
 *
 * Owns the live subscription for the signed-in user and exposes the list as a
 * single `NotesState` union, so screens never have to reconcile separate
 * loading / error / data flags.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { firebaseNotesService } from './services/firebase-notes-service';
import type { NotesService, NotesState } from './services/notes-service';

import { useAuth } from '@/providers/auth-provider';
import { reportError } from '@/services/telemetry';

/** The states the listener itself can produce; the rest are derived from `uid`. */
type LoadedState = Extract<NotesState, { status: 'ready' } | { status: 'error' }>;

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

  /** Whatever the listener has delivered so far; null means "nothing yet". */
  const [loaded, setLoaded] = useState<LoadedState | null>(null);
  const [subscribedUid, setSubscribedUid] = useState(uid);

  // Adjusting state during render is React's sanctioned way to reset when an
  // input changes. It avoids the extra commit an effect would cause, and stops
  // the previous user's notes showing before the new listener delivers.
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
      notes => setLoaded({ status: 'ready', notes }),
      error => {
        setLoaded({ status: 'error', message: error.message });
        reportError(error, 'notes: subscription');
      },
    );
  }, [uid, service]);

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
    // Derived rather than stored, so signedOut / loading can never disagree with `uid`.
    const state: NotesState = !uid ? { status: 'signedOut' } : (loaded ?? { status: 'loading' });
    return { state, add, remove };
  }, [uid, loaded, add, remove]);

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const value = useContext(NotesContext);
  if (!value) {
    throw new Error('useNotes must be used inside <NotesProvider>');
  }
  return value;
}
