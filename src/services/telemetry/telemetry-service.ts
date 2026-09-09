/**
 * The telemetry seam: Analytics and Crashlytics behind one interface.
 *
 * It covers the diagnostic reads too (app identity, instance id, crash-collection
 * toggle) so the Diagnostics screen never imports a vendor SDK either.
 */

export type AppInfo = {
  name: string;
  projectId: string;
  appId: string;
};

export interface TelemetryService {
  trackScreenView(screenName: string): void;
  trackEvent(name: string, params?: Record<string, unknown>): void;
  breadcrumb(message: string): void;
  reportError(error: unknown, context?: string): void;
  identifyUser(uid: string | null): void;

  appInfo(): AppInfo;
  getAppInstanceId(): Promise<string | null>;
  didCrashOnPreviousExecution(): Promise<boolean>;
  isCollectionEnabled(): boolean;
  setCollectionEnabled(enabled: boolean): Promise<void>;
  /** Forces a native crash. Only meaningful when a native layer is present. */
  crash(): void;
}
