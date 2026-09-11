/**
 * Sign-in vocabulary, shared by the app and the API contract.
 *
 * Lives in `src/domain/` so `wire.ts` and the auth seam agree by construction
 * rather than by two matching literals. Imports nothing, like the rest of this
 * folder, so the server can compile against it.
 */

/**
 * The ways an account can sign in. An account may have more than one — signing
 * up by email and later attaching Apple leaves both in place.
 *
 * There is no anonymous member: every account has an email, including those
 * created through Apple's private relay.
 */
export const AUTH_PROVIDERS = ['email', 'apple', 'google'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/** The two that exchange a provider token rather than a password. */
export type OAuthProvider = Exclude<AuthProvider, 'email'>;
