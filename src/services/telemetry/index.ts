/**
 * Telemetry facade.
 *
 * Screens and providers call these functions; the composition root decides which
 * implementations are behind them.
 *
 * Service implementations may import this file — `shared/pending-writes.ts` and
 * friends do, to report their own failures. That used to be forbidden here and
 * was violated anyway; see `registry.ts` for why it is now safe.
 *
 * Analytics and crash reporting are two different vendors behind here now
 * (Mixpanel and Crashlytics), which is precisely what this facade exists to
 * hide: no call site changed when they split.
 *
 * The implementations come from `registry.ts`, not from the composition root.
 * Reading the root from here closed an import cycle, because the root imports
 * every implementation and several of those import this file back — see that
 * file for the trace.
 */
import { telemetry } from './registry';

export const trackScreenView = (screenName: string) =>
  telemetry.analytics.trackScreenView(screenName);

export const trackEvent = (name: string, params?: Record<string, unknown>) =>
  telemetry.analytics.trackEvent(name, params);

export const breadcrumb = (message: string) => telemetry.crash.breadcrumb(message);

export const reportError = (error: unknown, context?: string) =>
  telemetry.crash.reportError(error, context);

/** One call, both vendors: analytics needs the identity, so does the crash report. */
export const identifyUser = (uid: string | null) => {
  telemetry.analytics.identifyUser(uid);
  telemetry.crash.identifyUser(uid);
};

/** Profile attributes for the signed-in athlete. */
export const setUserProperties = (properties: Record<string, unknown>) =>
  telemetry.analytics.setUserProperties(properties);

/**
 * Analytics consent. Analytics is off until this is called with `true`.
 * Crash reporting is unaffected: it is not behavioural tracking.
 */
export const setAnalyticsConsent = (granted: boolean) => telemetry.analytics.setConsent(granted);

/** Diagnostic reads. */
export const crashReporter = () => telemetry.crash;

export type { AnalyticsService, AppInfo, CrashService } from './telemetry-service';
