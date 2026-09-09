/**
 * Public surface of the auth feature. Consumers import from
 * '@/providers/auth-provider' and never reach into the folder's internals.
 */
export { AuthProvider, useAuth } from './auth-provider';
export { AuthError } from './services/auth-service';
export type { AuthService, AuthUser } from './services/auth-service';
