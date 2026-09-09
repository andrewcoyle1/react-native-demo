/**
 * Firebase implementation of `AuthService`.
 *
 * This is the only file in the auth feature that imports the Firebase SDK.
 */
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from '@react-native-firebase/auth';

import { AuthError, type AuthService, type AuthUser } from './auth-service';

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) {
    return null;
  }
  return {
    uid: user.uid,
    email: user.email,
    isAnonymous: user.isAnonymous,
    emailVerified: user.emailVerified,
  };
}

/** Firebase surfaces failures as an Error with a `code` such as `auth/wrong-password`. */
function describe(code: string, error: unknown) {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/weak-password':
      return 'Passwords must be at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/network-request-failed':
      return 'Network unavailable. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'That sign-in method is disabled in the Firebase console.';
    default:
      return error instanceof Error ? error.message : 'Something went wrong.';
  }
}

/** Runs a Firebase call and rethrows any failure as a domain `AuthError`. */
async function run(work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
  } catch (error) {
    const code = (error as { code?: string })?.code ?? 'auth/unknown';
    throw new AuthError(code, describe(code, error));
  }
}

export const firebaseAuthService: AuthService = {
  observeUser: onChange => onAuthStateChanged(getAuth(), user => onChange(toAuthUser(user))),

  signIn: (email, password) => run(() => signInWithEmailAndPassword(getAuth(), email, password)),

  signUp: (email, password) => run(() => createUserWithEmailAndPassword(getAuth(), email, password)),

  signInAnonymously: () => run(() => firebaseSignInAnonymously(getAuth())),

  signOut: () => run(() => firebaseSignOut(getAuth())),
};
