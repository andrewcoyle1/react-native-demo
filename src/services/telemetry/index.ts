/**
 * Telemetry facade.
 *
 * Screens and providers call these functions; the composition root decides which
 * implementation is behind them. Implementations must never import this file —
 * that would close an import cycle.
 */
import { services } from '@/services/container';

export const trackScreenView = (screenName: string) => services.telemetry.trackScreenView(screenName);

export const trackEvent = (name: string, params?: Record<string, unknown>) =>
  services.telemetry.trackEvent(name, params);

export const breadcrumb = (message: string) => services.telemetry.breadcrumb(message);

export const reportError = (error: unknown, context?: string) =>
  services.telemetry.reportError(error, context);

export const identifyUser = (uid: string | null) => services.telemetry.identifyUser(uid);

/** Diagnostic reads, used by the Diagnostics screen. */
export const telemetry = () => services.telemetry;

export type { AppInfo, TelemetryService } from './telemetry-service';
