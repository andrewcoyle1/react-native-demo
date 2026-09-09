/**
 * The auth seam: types and the interface only.
 *
 * Implementations live alongside this file (`firebase-auth-service.ts`,
 * `mock-auth-service.ts`). Nothing here imports a vendor SDK, so the provider
 * and every screen above it stay backend-agnostic.
 */

/** The app's own user shape. Screens never see a Firebase `User`. */
export type AuthUser = {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
  emailVerified: boolean;
};

/**
 * Vendor-neutral auth failure. `message` is already human-readable, and `code`
 * is a stable string safe to send to analytics.
 */
export class AuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Implement this to swap the backend or fake auth in tests. */
export interface AuthService {
  /** Subscribes to sign-in state. Returns an unsubscribe function. */
  observeUser(onChange: (user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signInAnonymously(): Promise<void>;
  signOut(): Promise<void>;
}
