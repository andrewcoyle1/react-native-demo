/**
 * Firestore implementation of `UserService`, over the `users/{uid}` document.
 *
 * The document path lives here so nothing above this file composes it. This is
 * the parent of the `users/{uid}/notes` subcollection the notes feature owns.
 */
import {
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from '@react-native-firebase/firestore';

import type { UserModel, UserSex, UserService } from './user-service';

const SEXES: readonly UserSex[] = ['male', 'female', 'other'];

function userDoc(uid: string) {
  return doc(getFirestore(), 'users', uid);
}

function isUserSex(value: unknown): value is UserSex {
  return typeof value === 'string' && (SEXES as readonly string[]).includes(value);
}

function toDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

/**
 * Converts a document's data into the model, or null when it cannot be one.
 *
 * A half-written document surfaces as `absent` rather than as a model with an
 * invented name or date of birth, which keeps `UserModel` strict for everything
 * above the seam.
 */
function toUserModel(id: string, data: Record<string, unknown> | undefined): UserModel | null {
  if (!data) {
    return null;
  }

  const dateOfBirth = toDate(data.dateOfBirth);
  if (typeof data.name !== 'string' || !data.name || !dateOfBirth || !isUserSex(data.sex)) {
    return null;
  }

  return {
    id,
    name: data.name,
    dateOfBirth,
    sex: data.sex,
    createdAt: toDate(data.createdAt),
    modifiedAt: toDate(data.modifiedAt),
  };
}

export const firebaseUserService: UserService = {
  subscribe(uid, onUser, onError) {
    return onSnapshot(
      userDoc(uid),
      snapshot => onUser(toUserModel(snapshot.id, snapshot.data())),
      onError,
    );
  },

  async create(uid, draft) {
    await setDoc(userDoc(uid), {
      name: draft.name.trim(),
      dateOfBirth: Timestamp.fromDate(draft.dateOfBirth),
      sex: draft.sex,
      createdAt: serverTimestamp(),
      modifiedAt: serverTimestamp(),
    });
  },

  async update(uid, changes) {
    await updateDoc(userDoc(uid), {
      ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      ...(changes.dateOfBirth !== undefined
        ? { dateOfBirth: Timestamp.fromDate(changes.dateOfBirth) }
        : {}),
      ...(changes.sex !== undefined ? { sex: changes.sex } : {}),
      modifiedAt: serverTimestamp(),
    });
  },
};
