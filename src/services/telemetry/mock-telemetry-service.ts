/**
 * Telemetry for the mock environment: records nothing remotely, logs everything
 * locally so you can still see what the app would have reported.
 */
import type { AppInfo, TelemetryService } from './telemetry-service';

function log(operation: string, detail?: unknown) {
  if (detail === undefined) {
    console.log(`[telemetry:mock] ${operation}`);
  } else {
    console.log(`[telemetry:mock] ${operation}`, detail);
  }
}

let collectionEnabled = false;

export const mockTelemetryService: TelemetryService = {
  trackScreenView: screenName => log('screen_view', screenName),
  trackEvent: (name, params) => log(`event ${name}`, params),
  breadcrumb: message => log('breadcrumb', message),
  reportError: (error, context) => log(`error${context ? ` (${context})` : ''}`, error),
  identifyUser: uid => log('identify', uid),

  appInfo: (): AppInfo => ({
    name: '[MOCK]',
    projectId: 'mock-project',
    appId: 'mock:000000000000:ios:0000000000000000',
  }),

  getAppInstanceId: async () => 'MOCK-INSTANCE-ID',
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
