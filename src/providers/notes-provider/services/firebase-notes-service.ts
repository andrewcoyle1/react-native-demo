/**
 * Firestore implementation of `NotesService`, over `users/{uid}/notes`.
 *
 * The collection path and ordering live here so nothing above this file composes
 * queries of its own.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from '@react-native-firebase/firestore';

import type { NotesService } from './notes-service';

const MAX_NOTES = 50;

function notesCollection(uid: string) {
  return collection(getFirestore(), 'users', uid, 'notes');
}

export const firebaseNotesService: NotesService = {
  subscribe(uid, onNotes, onError) {
    const notesQuery = query(notesCollection(uid), orderBy('createdAt', 'desc'), limit(MAX_NOTES));

    return onSnapshot(
      notesQuery,
      snapshot => {
        onNotes(
          snapshot.docs.map(document => {
            const data = document.data();
            const createdAt = data.createdAt;
            return {
              id: document.id,
              text: typeof data.text === 'string' ? data.text : '',
              createdAt: createdAt instanceof Timestamp ? createdAt.toDate() : null,
            };
          }),
        );
      },
      onError,
    );
  },

  async add(uid, text) {
    await addDoc(notesCollection(uid), {
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
  },

  async remove(uid, noteId) {
    await deleteDoc(doc(notesCollection(uid), noteId));
  },
};
