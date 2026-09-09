/**
 * Firebase implementation of `TelemetryService` (Analytics + Crashlytics).
 *
 * Collection is switched on only in production — see `@/config/environment`.
 * Every call is fire-and-forget: telemetry must never break a user flow, so
 * failures are swallowed after being logged.
 */
import { getApp } from '@react-native-firebase/app';
import {
  getAnalytics,
  getAppInstanceId,
  logEvent,
  logScreenView,
  setAnalyticsCollectionEnabled,
  setUserId as setAnalyticsUserId,
} from '@react-native-firebase/analytics';
import {
  didCrashOnPreviousExecution,
  crash as firebaseCrash,
  getCrashlytics,
  log as crashlyticsLog,
  recordError,
  setCrashlyticsCollectionEnabled,
  setUserId as setCrashlyticsUserId,
} from '@react-native-firebase/crashlytics';

import type { AppInfo, TelemetryService } from './telemetry-service';

import { flags } from '@/config/environment';

function swallow(operation: string) {
  return (error: unknown) => {
    console.warn(`[telemetry] ${operation} failed`, error);
  };
}

function trace(operation: string, detail?: unknown) {
  if (flags.verboseLogging) {
    console.log(`[telemetry] ${operation}`, detail ?? '');
  }
}

const service: TelemetryService = {
  trackScreenView(screenName) {
    trace('screen_view', screenName);
    logScreenView(getAnalytics(), {
      screen_name: screenName,
      screen_class: screenName,
    }).catch(swallow('trackScreenView'));
  },

  trackEvent(name, params) {
    trace(`event ${name}`, params);
    try {
      logEvent(getAnalytics(), name, params);
    } catch (error) {
      swallow('trackEvent')(error);
    }
  },

  breadcrumb(message) {
    trace('breadcrumb', message);
    crashlyticsLog(getCrashlytics(), message);
  },

  reportError(error, context) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    trace('reportError', context ?? normalized.message);
    if (context) {
      crashlyticsLog(getCrashlytics(), context);
    }
    recordError(getCrashlytics(), normalized, context);
  },

  identifyUser(uid) {
    trace('identify', uid);
    setAnalyticsUserId(getAnalytics(), uid).catch(swallow('identifyUser (analytics)'));
    setCrashlyticsUserId(getCrashlytics(), uid ?? '').catch(swallow('identifyUser (crashlytics)'));
  },

  appInfo(): AppInfo {
    const app = getApp();
    return {
      name: app.name,
      projectId: app.options.projectId ?? 'unknown',
      appId: app.options.appId ?? 'unknown',
    };
  },

  getAppInstanceId: () => getAppInstanceId(getAnalytics()),
  didCrashOnPreviousExecution: () => didCrashOnPreviousExecution(getCrashlytics()),
  isCollectionEnabled: () => getCrashlytics().isCrashlyticsCollectionEnabled,
  setCollectionEnabled: async enabled => {
    await setCrashlyticsCollectionEnabled(getCrashlytics(), enabled);
  },
  crash: () => firebaseCrash(getCrashlytics()),
};

/**
 * Builds the service and applies the environment's collection flags.
 *
 * This is a factory rather than a module-level constant deliberately: the
 * composition root imports both this file and the mock, so any Firebase call at
 * module scope would fire even when the mock is selected.
 */
export function createFirebaseTelemetryService(): TelemetryService {
  setAnalyticsCollectionEnabled(getAnalytics(), flags.analyticsEnabled).catch(
    swallow('setAnalyticsCollectionEnabled'),
  );
  setCrashlyticsCollectionEnabled(getCrashlytics(), flags.crashlyticsEnabled).catch(
    swallow('setCrashlyticsCollectionEnabled'),
  );
  return service;
}
