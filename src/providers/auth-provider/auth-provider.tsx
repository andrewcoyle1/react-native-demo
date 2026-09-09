/**
 * Auth provider — the "manager" layer.
 *
 * Owns the signed-in state, coordinates the auth service, and reports identity
 * to telemetry. It holds no Firebase knowledge of its own: everything vendor
 * specific sits behind `AuthService`.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import type { AuthService, AuthUser } from './services/auth-service';
import { firebaseAuthService } from './services/firebase-auth-service';

import { breadcrumb, identifyUser } from '@/services/telemetry';

type AuthContextValue = {
  /** The signed-in user, or null when signed out. */
  user: AuthUser | null;
  /** True until the first auth state event arrives. */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = PropsWithChildren<{
  /**
   * Injected dependency. Defaults to the Firebase implementation; pass a fake
   * in tests. This is the whole DI story — no container required.
   */
  service?: AuthService;
}>;

export function AuthProvider({ children, service = firebaseAuthService }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return service.observeUser(nextUser => {
      setUser(nextUser);
      setInitializing(false);
      identifyUser(nextUser?.uid ?? null);
      breadcrumb(nextUser ? `auth: signed in (${nextUser.uid})` : 'auth: signed out');
    });
  }, [service]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      signIn: (email, password) => service.signIn(email, password),
      signUp: (email, password) => service.signUp(email, password),
      signInAnonymously: () => service.signInAnonymously(),
      signOut: () => service.signOut(),
    }),
    [user, initializing, service],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return value;
}
