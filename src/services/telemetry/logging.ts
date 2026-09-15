/**
 * The two rules every telemetry implementation follows.
 *
 * Telemetry must never break a user flow, so failures are logged and dropped
 * rather than thrown; and outside production every call is echoed locally, so
 * you can see what the app would have reported without a vendor dashboard.
 */
import { flags } from '@/config/environment';

/** A rejection handler that logs and swallows. */
export function swallow(operation: string) {
  return (error: unknown) => {
    console.warn(`[telemetry] ${operation} failed`, error);
  };
}

export function trace(operation: string, detail?: unknown) {
  if (flags.verboseLogging) {
    console.log(`[telemetry] ${operation}`, detail ?? '');
  }
}
