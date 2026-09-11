/**
 * The HTTP client.
 *
 * Owns the session — the access token in memory, the refresh token in the
 * Keychain — and the one rule that everything else depends on: **refresh is
 * single-flight**.
 *
 * That rule is not defensive programming. On launch this app opens five or more
 * reads at once: the profile, notes, three training subscriptions and a session
 * window. If the access token has expired they all 401 together. Without a
 * shared in-flight refresh that is five concurrent refresh calls, and because
 * refresh tokens rotate, four of them present an already-consumed token — which
 * the server treats as theft and answers by revoking the whole family. The
 * athlete is signed out on every cold start.
 *
 * See `docs/api.md` for the contract this implements.
 */
import { apiBaseUrl } from '@/config/environment';
import type { ErrorDTO, SessionResponse } from '@/domain/wire.ts';
import { CHANGE_CURSOR_HEADER } from '@/domain/wire.ts';
import { clearRefreshToken, readRefreshToken, writeRefreshToken } from './token-store';

/** A failure the API described, as opposed to the network failing. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Requests give up rather than hanging a screen on a loading state forever. */
const TIMEOUT_MS = 15_000;

type Session = { accessToken: string; expiresAt: number };

let session: Session | null = null;

/** The single in-flight refresh, shared by every caller that needs one. */
let refreshing: Promise<Session | null> | null = null;

/** Called when the session ends for a reason the app did not ask for. */
let onSignedOut: (() => void) | null = null;

export function setSignedOutHandler(handler: (() => void) | null): void {
  onSignedOut = handler;
}

/** Adopts the session returned by sign-in, sign-up or a refresh. */
export async function adoptSession(response: SessionResponse): Promise<void> {
  session = { accessToken: response.accessToken, expiresAt: Date.parse(response.expiresAt) };
  await writeRefreshToken(response.refreshToken);
}

export async function discardSession(): Promise<void> {
  session = null;
  await clearRefreshToken();
}

export function currentRefreshToken(): Promise<string | null> {
  return readRefreshToken();
}

/**
 * Exchanges the stored refresh token for a new session.
 *
 * Every caller awaits the same promise, so a burst of expired requests produces
 * exactly one rotation.
 */
export function refreshSession(): Promise<Session | null> {
  refreshing ??= (async () => {
    const refreshToken = await readRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await send<SessionResponse>('POST', '/v1/auth/refresh', {
        body: { refreshToken },
        authenticated: false,
      });
      await adoptSession(response);
      return session;
    } catch (error) {
      // A refresh that the server rejected is terminal: the token is consumed,
      // revoked or expired, and retrying cannot help.
      if (error instanceof ApiError) {
        await discardSession();
        onSignedOut?.();
        return null;
      }
      // A network failure is not. Leave the stored token alone so the next
      // attempt can use it.
      throw error;
    }
  })().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

type SendOptions = {
  body?: unknown;
  authenticated?: boolean;
  /** Aborts the request when the caller goes away. */
  signal?: AbortSignal;
};

/** One HTTP call, with no refresh logic. `request` is what callers use. */
async function send<T>(method: string, path: string, options: SendOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // The caller's signal and our timeout both have to be able to abort.
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.authenticated !== false && session
          ? { Authorization: `Bearer ${session.accessToken}` }
          : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = (await response.json().catch(() => null)) as (ErrorDTO & T) | null;

    if (!response.ok) {
      const described = payload?.error;
      throw new ApiError(
        response.status,
        described?.code ?? 'unknown',
        described?.message ?? `Request failed with ${response.status}.`,
      );
    }

    lastCursor = response.headers.get(CHANGE_CURSOR_HEADER) ?? lastCursor;
    return payload as T;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

/**
 * The change-log position of the most recent read.
 *
 * Captured here, once, rather than in each service: every snapshot read carries
 * it, and the stream resumes from it. See `docs/streaming.md`.
 */
let lastCursor: string | null = null;

export function changeCursor(): string | null {
  return lastCursor;
}

/**
 * A request that refreshes and retries once on a 401.
 *
 * Exactly once: a second 401 after a successful refresh is a real authorization
 * failure, not a stale token, and retrying again would loop.
 */
export async function request<T>(
  method: string,
  path: string,
  options: SendOptions = {},
): Promise<T> {
  const needsAuth = options.authenticated !== false;

  // Refresh *before* sending when the token is known to be spent, which saves
  // the round trip that would 401.
  if (needsAuth && (!session || session.expiresAt <= Date.now())) {
    await refreshSession();
  }

  try {
    return await send<T>(method, path, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !needsAuth) {
      throw error;
    }

    const renewed = await refreshSession();
    if (!renewed) {
      throw error;
    }

    return send<T>(method, path, options);
  }
}

export const api = {
  get: <T>(path: string, options?: SendOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: SendOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: SendOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: SendOptions) =>
    request<T>('PUT', path, { ...options, body }),
  delete: <T>(path: string, options?: SendOptions) => request<T>('DELETE', path, options),
};
