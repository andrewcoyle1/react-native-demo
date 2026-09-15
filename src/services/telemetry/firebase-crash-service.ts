/**
 * Crashlytics implementation of `CrashService`.
 *
 * This file used to carry Analytics too; that half now lives in
 * `mixpanel-analytics-service.ts`. Crashlytics stays on Firebase for the moment
 * and is expected to be replaced by a dedicated crash vendor later — which is
 * what the seam split makes cheap.
 *
 * Collection is switched on only in production — see `@/config/environment`.
 */
import { getApp } from '@react-native-firebase/app';
import {
  didCrashOnPreviousExecution,
  crash as firebaseCrash,
  getCrashlytics,
  log as crashlyticsLog,
  recordError,
  setCrashlyticsCollectionEnabled,
  setUserId as setCrashlyticsUserId,
} from '@react-native-firebase/crashlytics';

import type { AppInfo, CrashService } from './telemetry-service';
import { swallow, trace } from './logging';

import { flags } from '@/config/environment';

const service: CrashService = {
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
    trace('identify (crashlytics)', uid);
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

  didCrashOnPreviousExecution: () => didCrashOnPreviousExecution(getCrashlytics()),
  isCollectionEnabled: () => getCrashlytics().isCrashlyticsCollectionEnabled,
  setCollectionEnabled: async enabled => {
    await setCrashlyticsCollectionEnabled(getCrashlytics(), enabled);
  },
  crash: () => firebaseCrash(getCrashlytics()),
};

/**
 * Builds the service and applies the environment's collection flag.
 *
 * This is a factory rather than a module-level constant deliberately: the
 * composition root imports both this file and the mock, so any Firebase call at
 * module scope would fire even when the mock is selected.
 */
export function createFirebaseCrashService(): CrashService {
  setCrashlyticsCollectionEnabled(getCrashlytics(), flags.crashlyticsEnabled).catch(
    swallow('setCrashlyticsCollectionEnabled'),
  );
  return service;
}
