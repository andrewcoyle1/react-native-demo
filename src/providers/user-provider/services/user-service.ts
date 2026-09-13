/**
 * The user seam: types and the interface only.
 *
 * Implementations live alongside this file (`firebase-user-service.ts`,
 * `mock-user-service.ts`). Nothing here imports a vendor SDK.
 */

import type { UnitSystem } from '@/domain/training';

export type UserSex = 'male' | 'female' | 'other';

/** The app's own profile shape. Screens never see a Firestore document. */
export type UserModel = {
  id: string;
  name: string;
  dateOfBirth: Date;
  sex: UserSex;
  /**
   * Which units every distance and pace is shown in. Part of the profile
   * rather than of settings because it is a column on `profiles`, and the
   * server formats nothing without it.
   */
  units: UnitSystem;
  /** Null until the server timestamp resolves (local writes surface optimistically). */
  createdAt: Date | null;
  modifiedAt: Date | null;
};

/**
 * The fields a caller supplies. `id` comes from auth and the timestamps from the
 * server, so neither is something a screen can pass in.
 */
export type UserDraft = {
  name: string;
  dateOfBirth: Date;
  sex: UserSex;
  units: UnitSystem;
};

/**
 * Every state the profile can be in. `absent` is the one that only exists
 * because auth and the profile document are created separately: the listener
 * has reported successfully, and there is no document yet.
 */
export type UserState =
  | { status: 'signedOut' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'absent' }
  | { status: 'ready'; user: UserModel };

export interface UserService {
  /**
   * Subscribes to the user's profile. Returns an unsubscribe function.
   *
   * `null` means the document does not exist — a successful read, not a failure.
   */
  subscribe(
    uid: string,
    onUser: (user: UserModel | null) => void,
    onError: (error: Error) => void,
  ): () => void;
  create(uid: string, draft: UserDraft): Promise<void>;
  update(uid: string, changes: Partial<UserDraft>): Promise<void>;
}
