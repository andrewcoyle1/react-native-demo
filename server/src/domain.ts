/**
 * The shared domain, re-exported.
 *
 * `src/domain/` in the mobile app is the single definition of the wire contract
 * and the training vocabulary (see `docs/api.md`). The server compiles the same
 * files rather than a copy, so a renamed field breaks both sides at once.
 *
 * This barrel exists so the path across that boundary is written once. Every
 * other file in the server imports from here.
 */
export * from '../../src/domain/training.ts';

// Also carries the `AuthProvider` and `OAuthProvider` types, which it
// re-exports from `domain/auth.ts`.
export * from '../../src/domain/wire.ts';

// The runtime array, which `wire.ts` re-exports only the types of.
export { AUTH_PROVIDERS } from '../../src/domain/auth.ts';
