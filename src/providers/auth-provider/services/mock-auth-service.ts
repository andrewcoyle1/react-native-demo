/**
 * In-memory `AuthService` for the mock environment.
 *
 * Accepts any credentials so you can explore the app without a backend. Two
 * emails are reserved, and both exist so a branch that is otherwise unreachable
 * without a server can be reached: `fail@example.com` raises an `AuthError`,
 * and `new@example.com` signs in to an account with no data at all.
 */
import { AuthError, type AuthService, type AuthUser } from './auth-service';

import {
  MOCK_FAILING_EMAIL,
  mockUidFor,
} from '@/providers/shared/mock-accounts';

let currentUser: AuthUser | null = null;
const listeners = new Set<(user: AuthUser | null) => void>();

function emit() {
  listeners.forEach(listener => listener(currentUser));
}

function setUser(user: AuthUser | null) {
  currentUser = user;
  emit();
}

function userFor(email: string): AuthUser {
  return {
    uid: mockUidFor(email),
    email,
    emailVerified: true,
    // Everything in mock mode signs in by email; Apple and Google arrive with
    // the API implementation, which is what will actually be able to do them.
    providers: ['email'],
  };
}

/** Mirrors the async shape of a real network call so loading states still show. */
function settle(work: () => void): Promise<void> {
  return new Promise(resolve =>
    setTimeout(() => {
      work();
      resolve();
    }, 150),
  );
}

export const mockAuthService: AuthService = {
  observeUser(onChange) {
    listeners.add(onChange);
    // Emit asynchronously so subscribers see the same "initializing" tick they
    // would get from Firebase, rather than a synchronous callback during render.
    const timer = setTimeout(() => onChange(currentUser), 0);
    return () => {
      clearTimeout(timer);
      listeners.delete(onChange);
    };
  },

  async signIn(email) {
    if (email.trim().toLowerCase() === MOCK_FAILING_EMAIL) {
      await settle(() => {});
      throw new AuthError('auth/invalid-credential', 'Email or password is incorrect.');
    }
    return settle(() => setUser(userFor(email.trim())));
  },

  signUp(email) {
    return settle(() => setUser(userFor(email.trim())));
  },

  signOut() {
    return settle(() => setUser(null));
  },

  deleteAccount() {
    return settle(() => setUser(null));
  },
};
