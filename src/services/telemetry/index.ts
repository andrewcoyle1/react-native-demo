/**
 * Telemetry facade.
 *
 * Screens and providers call these functions; the composition root decides which
 * implementations are behind them. Implementations must never import this file —
 * that would close an import cycle.
 *
 * Analytics and crash reporting are two different vendors behind here now
 * (Mixpanel and Crashlytics), which is precisely what this facade exists to
 * hide: no call site changed when they split.
 */
import { services } from '@/services/container';

export const trackScreenView = (screenName: string) =>
  services.analytics.trackScreenView(screenName);

export const trackEvent = (name: string, params?: Record<string, unknown>) =>
  services.analytics.trackEvent(name, params);

export const breadcrumb = (message: string) => services.crash.breadcrumb(message);

export const reportError = (error: unknown, context?: string) =>
  services.crash.reportError(error, context);

/** One call, both vendors: analytics needs the identity, so does the crash report. */
export const identifyUser = (uid: string | null) => {
  services.analytics.identifyUser(uid);
  services.crash.identifyUser(uid);
};

/** Profile attributes for the signed-in athlete. */
export const setUserProperties = (properties: Record<string, unknown>) =>
  services.analytics.setUserProperties(properties);

/**
 * Analytics consent. Analytics is off until this is called with `true`.
 * Crash reporting is unaffected: it is not behavioural tracking.
 */
export const setAnalyticsConsent = (granted: boolean) => services.analytics.setConsent(granted);

/** Diagnostic reads. */
export const crashReporter = () => services.crash;

export type { AnalyticsService, AppInfo, CrashService } from './telemetry-service';
