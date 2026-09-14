/**
 * The telemetry seams: analytics and crash reporting, separately.
 *
 * These were one interface while Firebase supplied both. Mixpanel does product
 * analytics and no crash reporting, so the two are now different vendors and
 * have to be different seams — which also means replacing Crashlytics later is
 * a one-line change in the composition root rather than surgery on a shared
 * implementation.
 *
 * `@/services/telemetry` (the facade) is what callers use; neither of these is
 * imported directly outside the composition root.
 */

export type AppInfo = {
  name: string;
  projectId: string;
  appId: string;
};

/** Product analytics: what the athlete did. */
export interface AnalyticsService {
  trackScreenView(screenName: string): void;
  trackEvent(name: string, params?: Record<string, unknown>): void;
  /** `null` on sign-out, which must start a fresh anonymous identity. */
  identifyUser(uid: string | null): void;
  /** Profile attributes for the identified athlete. No-op while anonymous. */
  setUserProperties(properties: Record<string, unknown>): void;
  /**
   * Turns transmission on or off.
   *
   * Implementations start opted **out**. Nothing is sent until this is called
   * with `true`, which is what makes the EU/California consent gate real
   * rather than advisory.
   */
  setConsent(granted: boolean): void;
}

/**
 * Crash reporting: what went wrong.
 *
 * `identifyUser` appears here as well as on `AnalyticsService` — one call from
 * the facade, two vendors to tell.
 */
export interface CrashService {
  breadcrumb(message: string): void;
  reportError(error: unknown, context?: string): void;
  identifyUser(uid: string | null): void;

  /*
   * Diagnostic reads. Nothing calls these today — the Diagnostics screen they
   * were written for is gone — but they are the crash vendor's own shape and
   * cost nothing to carry, so removing them is a separate decision.
   */
  appInfo(): AppInfo;
  didCrashOnPreviousExecution(): Promise<boolean>;
  isCollectionEnabled(): boolean;
  setCollectionEnabled(enabled: boolean): Promise<void>;
  /** Forces a native crash. Only meaningful when a native layer is present. */
  crash(): void;
}
