/**
 * In-memory `NotesService` for the mock environment.
 *
 * Notes are stored per uid and subscribers are notified on every mutation, so the
 * UI updates exactly as Firestore's `onSnapshot` makes it.
 */
import type { Note, NotesService } from './notes-service';

type Listener = (notes: Note[]) => void;

const store = new Map<string, Note[]>();
const listeners = new Map<string, Set<Listener>>();

let nextId = 0;

function seed(uid: string): Note[] {
  const now = Date.now();
  return [
    { id: `seed-${uid}-1`, text: 'Mock mode makes no network calls.', createdAt: new Date(now) },
    { id: `seed-${uid}-2`, text: 'Try adding and deleting a note.', createdAt: new Date(now - 60_000) },
    { id: `seed-${uid}-3`, text: 'Seeded from mock-notes-service.ts', createdAt: new Date(now - 120_000) },
  ];
}

function notesFor(uid: string): Note[] {
  if (!store.has(uid)) {
    store.set(uid, seed(uid));
  }
  return store.get(uid)!;
}

function emit(uid: string) {
  const snapshot = [...notesFor(uid)];
  listeners.get(uid)?.forEach(listener => listener(snapshot));
}

/** Mirrors the async shape of a real write so loading states still show. */
function settle(work: () => void): Promise<void> {
  return new Promise(resolve =>
    setTimeout(() => {
      work();
      resolve();
    }, 120),
  );
}

export const mockNotesService: NotesService = {
  subscribe(uid, onNotes) {
    const forUid = listeners.get(uid) ?? new Set<Listener>();
    forUid.add(onNotes);
    listeners.set(uid, forUid);

    // Deliver asynchronously, matching Firestore's first-snapshot behaviour.
    const timer = setTimeout(() => onNotes([...notesFor(uid)]), 0);

    return () => {
      clearTimeout(timer);
      forUid.delete(onNotes);
    };
  },

  add(uid, text) {
    return settle(() => {
      nextId += 1;
      store.set(uid, [
        { id: `mock-${nextId}`, text: text.trim(), createdAt: new Date() },
        ...notesFor(uid),
      ]);
      emit(uid);
    });
  },

  remove(uid, noteId) {
    return settle(() => {
      store.set(
        uid,
        notesFor(uid).filter(note => note.id !== noteId),
      );
      emit(uid);
    });
  },
};
