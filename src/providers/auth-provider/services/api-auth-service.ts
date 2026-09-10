/**
 * `AuthService` over the Stamina API.
 *
 * The third implementation of this seam, alongside Firebase and the mock, and
 * the one the app will keep. Nothing above it changes: the provider and every
 * screen see the same five methods and the same `AuthUser`.
 *
 * Firebase kept sign-in state for us and replayed it on launch. Here that is
 * this file's job — the stored refresh token is the durable half of a session,
 * and restoring one means exchanging it for a fresh pair before anything else
 * asks for data.
 */
import { AuthError, type AuthService, type AuthUser } from './auth-service';

import type { AuthUserDTO, SessionResponse } from '@/domain/wire.ts';
import { readCache, writeCache } from '@/providers/shared/persistence';
import {
  ApiError,
  adoptSession,
  api,
  currentRefreshToken,
  discardSession,
  refreshSession,
  setSignedOutHandler,
} from '@/services/api/client';

function toAuthUser(dto: AuthUserDTO): AuthUser {
  return {
    uid: dto.uid,
    email: dto.email,
    emailVerified: dto.emailVerified,
    providers: dto.providers,
  };
}

/**
 * The last account known to be signed in.
 *
 * Not a credential — a uid, an email and which providers are attached — so it
 * lives beside the other caches rather than in the Keychain. It exists so that
 * launching without a network is not the same as being signed out: the refresh
 * token is still there, still unexpired, and still the only thing that can
 * actually obtain access.
 */
const USER_CACHE_KEY = 'auth.user';

let currentUser: AuthUser | null = null;
const listeners = new Set<(user: AuthUser | null) => void>();

function emit() {
  listeners.forEach(listener => listener(currentUser));
}

function setUser(user: AuthUser | null) {
  currentUser = user;
  void writeCache(USER_CACHE_KEY, user);
  emit();
}

/** The server ended the session underneath us — a revoked or replayed token. */
setSignedOutHandler(() => setUser(null));

/**
 * Runs once per launch, and everyone who subscribes before it finishes waits
 * for the same attempt rather than starting their own.
 */
let restoring: Promise<void> | null = null;

function restoreSession(): Promise<void> {
  restoring ??= (async () => {
    if (!(await currentRefreshToken())) {
      setUser(null);
      return;
    }

    try {
      const renewed = await refreshSession();

      // Null means the *server* rejected the token — consumed, revoked or
      // expired. That is a real sign-out, and `refreshSession` has already
      // discarded it.
      if (!renewed) {
        setUser(null);
        return;
      }

      setUser(toAuthUser(await api.get<AuthUserDTO>('/v1/auth/me')));
    } catch {
      /*
       * The server could not be reached, which is a different thing entirely.
       * The refresh token is untouched and may still be perfectly good, so
       * reporting signed out would throw the athlete back to onboarding every
       * time they open the app on a train — and would make the caches
       * unreachable, since nothing below the auth gate ever mounts.
       *
       * Stay optimistically signed in as whoever was last known. Every request
       * still fails until the network returns, and the next successful refresh
       * is what proves the session is real.
       */
      const remembered = (await readCache(USER_CACHE_KEY)) as AuthUser | null;
      setUser(remembered ?? null);
    }
  })();

  return restoring;
}

/**
 * Human copy for each failure the API can return.
 *
 * The server's own `message` is written for logs and developers — a rejected
 * password arrives as "body/password must NOT have fewer than 8 characters".
 * The code is the stable thing; the wording belongs here, next to the screens
 * that show it, exactly as the Firebase implementation does it.
 */
function messageFor(code: string, fallback: string): string {
  switch (code) {
    case 'email_taken':
      return 'That email is already registered. Try signing in instead.';
    case 'invalid_credentials':
      return 'Email or password is incorrect.';
    case 'validation_failed':
      return 'Check your email address, and use a password of at least 8 characters.';
    case 'token_reused':
    case 'token_revoked':
    case 'token_expired':
    case 'token_invalid':
      return 'Your session has ended. Please sign in again.';
    case 'rate_limited':
      return 'Too many attempts. Wait a moment and try again.';
    case 'internal':
      return 'Something went wrong at our end. Please try again.';
    default:
      return fallback;
  }
}

/** Turns an API failure into the vendor-neutral error the screens already show. */
function describe(error: unknown): AuthError {
  if (error instanceof ApiError) {
    return new AuthError(error.code, messageFor(error.code, error.message));
  }
  return new AuthError(
    'auth/network-request-failed',
    'Cannot reach the server. Is it running on the address the app is pointed at?',
  );
}

async function startSession(path: string, body: unknown): Promise<void> {
  try {
    const session = await api.post<SessionResponse>(path, body, { authenticated: false });
    await adoptSession(session);
    setUser(toAuthUser(session.user));
  } catch (error) {
    throw describe(error);
  }
}

export const apiAuthService: AuthService = {
  observeUser(onChange) {
    listeners.add(onChange);

    // Deferred so subscribers see the same "initializing" tick Firebase gave
    // them, rather than a synchronous callback during render.
    const timer = setTimeout(() => {
      if (restoring) {
        onChange(currentUser);
      } else {
        void restoreSession();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      listeners.delete(onChange);
    };
  },

  signIn(email, password) {
    return startSession('/v1/auth/sign-in', { email: email.trim(), password });
  },

  signUp(email, password) {
    return startSession('/v1/auth/sign-up', {
      email: email.trim(),
      password,
      // The server cannot work out what day it is for this athlete without it.
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  },

  async signOut() {
    const refreshToken = await currentRefreshToken();

    try {
      if (refreshToken) {
        await api.post('/v1/auth/sign-out', { refreshToken }, { authenticated: false });
      }
    } catch {
      // Signing out locally must succeed even when the server cannot be told.
      // The token expires on its own; leaving the athlete signed in would be
      // the worse failure.
    } finally {
      await discardSession();
      setUser(null);
    }
  },
};
