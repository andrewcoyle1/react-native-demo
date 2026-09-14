/**
 * Telemetry for the mock environment, and the fallback when no Mixpanel token
 * is configured: records nothing remotely, logs everything locally so you can
 * still see what the app would have reported.
 */
import type { AnalyticsService, AppInfo, CrashService } from './telemetry-service';

function log(operation: string, detail?: unknown) {
  if (detail === undefined) {
    console.log(`[telemetry:mock] ${operation}`);
  } else {
    console.log(`[telemetry:mock] ${operation}`, detail);
  }
}

export const mockAnalyticsService: AnalyticsService = {
  trackScreenView: screenName => log('screen_view', screenName),
  trackEvent: (name, params) => log(`event ${name}`, params),
  identifyUser: uid => log('identify (analytics)', uid),
  setUserProperties: properties => log('people.set', properties),
  setConsent: granted => log('consent', granted ? 'granted' : 'denied'),
};

let collectionEnabled = false;

export const mockCrashService: CrashService = {
  breadcrumb: message => log('breadcrumb', message),
  reportError: (error, context) => log(`error${context ? ` (${context})` : ''}`, error),
  identifyUser: uid => log('identify (crash)', uid),

  appInfo: (): AppInfo => ({
    name: '[MOCK]',
    projectId: 'mock-project',
    appId: 'mock:000000000000:ios:0000000000000000',
  }),

  didCrashOnPreviousExecution: async () => false,
  isCollectionEnabled: () => collectionEnabled,
  setCollectionEnabled: async enabled => {
    collectionEnabled = enabled;
    log('setCollectionEnabled', enabled);
  },
  crash: () => {
    // There is no native layer to crash in mock mode.
    throw new Error('[telemetry:mock] crash() is unavailable in the mock environment.');
  },
};
