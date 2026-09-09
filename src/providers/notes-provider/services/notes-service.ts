/**
 * The notes seam: types and the interface only.
 *
 * Implementations live alongside this file. Nothing here imports a vendor SDK.
 */

export type Note = {
  id: string;
  text: string;
  /** Null until the server timestamp resolves (local writes surface optimistically). */
  createdAt: Date | null;
};

/**
 * Every state the notes list can be in. Modelled as a union so impossible
 * combinations — "loaded but also errored", "no notes and no error" — cannot be
 * represented at all.
 */
export type NotesState =
  | { status: 'signedOut' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; notes: Note[] };

export interface NotesService {
  /** Subscribes to the user's notes. Returns an unsubscribe function. */
  subscribe(
    uid: string,
    onNotes: (notes: Note[]) => void,
    onError: (error: Error) => void,
  ): () => void;
  add(uid: string, text: string): Promise<void>;
  remove(uid: string, noteId: string): Promise<void>;
}
