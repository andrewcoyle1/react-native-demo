/**
 * The auth seam: types and the interface only.
 *
 * Implementations live alongside this file (`firebase-auth-service.ts`,
 * `mock-auth-service.ts`). Nothing here imports a vendor SDK, so the provider
 * and every screen above it stay backend-agnostic.
 *
 * Apple and Google sign-in are not here yet. They need native modules and a
 * rebuild, so they land with the API implementation rather than being declared
 * now and left throwing.
 */
import type { AuthProvider } from '@/domain/auth';


/** The app's own user shape. Screens never see a vendor `User`. */
export type AuthUser = {
  uid: string;
  /**
   * Every account has one, including those created through Apple's private
   * relay. Nullable only because the current Firebase implementation cannot
   * promise otherwise; the API contract types it as a plain string.
   */
  email: string | null;
  emailVerified: boolean;
  /** Which sign-in methods are attached, so the app can offer the rest. */
  providers: AuthProvider[];
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
  signOut(): Promise<void>;
}
