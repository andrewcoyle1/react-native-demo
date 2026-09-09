/**
 * In-memory `AuthService` for the mock environment.
 *
 * Accepts any credentials so you can explore the app without a Firebase account.
 * Signing in as `fail@example.com` raises an `AuthError` instead, so the error
 * path stays exercisable.
 */
import { AuthError, type AuthService, type AuthUser } from './auth-service';

const FAILING_EMAIL = 'fail@example.com';

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
    uid: `mock-${email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    email,
    isAnonymous: false,
    emailVerified: true,
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
    if (email.trim().toLowerCase() === FAILING_EMAIL) {
      await settle(() => {});
      throw new AuthError('auth/invalid-credential', 'Email or password is incorrect.');
    }
    return settle(() => setUser(userFor(email.trim())));
  },

  signUp(email) {
    return settle(() => setUser(userFor(email.trim())));
  },

  signInAnonymously() {
    return settle(() =>
      setUser({
        uid: 'mock-anonymous',
        email: null,
        isAnonymous: true,
        emailVerified: false,
      }),
    );
  },

  signOut() {
    return settle(() => setUser(null));
  },
};
