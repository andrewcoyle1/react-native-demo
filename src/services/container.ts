/**
 * Composition root.
 *
 * The single place where an environment is turned into concrete dependencies.
 * `_layout.tsx` calls `createServices` once and passes the result down through
 * `ServicesProvider`, so the wiring stays visible rather than hidden behind
 * defaults — and nothing here runs merely because a file was imported.
 */
import { environment, mixpanelToken, type AppEnvironment } from '@/config/environment';
import { apiActivitiesService } from '@/providers/activities-provider/services/api-activities-service';
import { firebaseActivitiesService } from '@/providers/activities-provider/services/firebase-activities-service';
import { mockActivitiesService } from '@/providers/activities-provider/services/mock-activities-service';
import type { ActivitiesService } from '@/providers/activities-provider/services/activities-service';
import type { AuthService } from '@/providers/auth-provider/services/auth-service';
import { apiAuthService } from '@/providers/auth-provider/services/api-auth-service';
import { firebaseAuthService } from '@/providers/auth-provider/services/firebase-auth-service';
import { mockAuthService } from '@/providers/auth-provider/services/mock-auth-service';
import { firebaseNotesService } from '@/providers/notes-provider/services/firebase-notes-service';
import { mockNotesService } from '@/providers/notes-provider/services/mock-notes-service';
import type { NotesService } from '@/providers/notes-provider/services/notes-service';
import { apiOnboardingService } from '@/services/onboarding/api-onboarding-service';
import { firebaseOnboardingService } from '@/services/onboarding/firebase-onboarding-service';
import { mockOnboardingService } from '@/services/onboarding/mock-onboarding-service';
import type { OnboardingService } from '@/services/onboarding/onboarding-service';
import { apiConsentService } from '@/services/consent/api-consent-service';
import type { ConsentService } from '@/services/consent/consent-service';
import { firebaseConsentService } from '@/services/consent/firebase-consent-service';
import { mockConsentService } from '@/services/consent/mock-consent-service';
import { apiSettingsService } from '@/providers/settings-provider/services/api-settings-service';
import { mockSettingsService } from '@/providers/settings-provider/services/mock-settings-service';
import type { SettingsService } from '@/providers/settings-provider/services/settings-service';
import { apiSessionsService } from '@/providers/sessions-provider/services/api-sessions-service';
import { firebaseSessionsService } from '@/providers/sessions-provider/services/firebase-sessions-service';
import { mockSessionsService } from '@/providers/sessions-provider/services/mock-sessions-service';
import type { SessionsService } from '@/providers/sessions-provider/services/sessions-service';
import { apiTrainingService } from '@/providers/training-provider/services/api-training-service';
import { firebaseTrainingService } from '@/providers/training-provider/services/firebase-training-service';
import { mockTrainingService } from '@/providers/training-provider/services/mock-training-service';
import type { TrainingService } from '@/providers/training-provider/services/training-service';
import { apiUserService } from '@/providers/user-provider/services/api-user-service';
import { firebaseUserService } from '@/providers/user-provider/services/firebase-user-service';
import { mockUserService } from '@/providers/user-provider/services/mock-user-service';
import type { UserService } from '@/providers/user-provider/services/user-service';
import { createFirebaseCrashService } from '@/services/telemetry/firebase-crash-service';
import { createMixpanelAnalyticsService } from '@/services/telemetry/mixpanel-analytics-service';
import {
  mockAnalyticsService,
  mockCrashService,
} from '@/services/telemetry/mock-telemetry-services';
import { apiTrendsService } from '@/providers/trends-provider/services/api-trends-service';
import { firebaseTrendsService } from '@/providers/trends-provider/services/firebase-trends-service';
import { mockTrendsService } from '@/providers/trends-provider/services/mock-trends-service';
import type { TrendsService } from '@/providers/trends-provider/services/trends-service';
import { setTelemetryServices } from '@/services/telemetry/registry';
import type { AnalyticsService, CrashService } from '@/services/telemetry/telemetry-service';

export type Services = {
  activities: ActivitiesService;
  auth: AuthService;
  notes: NotesService;
  onboarding: OnboardingService;
  sessions: SessionsService;
  settings: SettingsService;
  consent: ConsentService;
  training: TrainingService;
  trends: TrendsService;
  user: UserService;
  analytics: AnalyticsService;
  crash: CrashService;
};

/**
 * Builds the dependencies for an environment.
 *
 * A function, not a constant, and that is the point. As a constant the
 * environment was fixed at *import* time: one container per process, chosen by
 * whatever `process.env` held, with no way to ask for another. Nothing below
 * this file could be exercised against fakes without mocking the module, which
 * is why the four-environment switch below has never been run except by
 * launching the app four times.
 *
 * It also means the vendors are constructed when this is *called* rather than
 * when it is imported — `createFirebaseCrashService()` enables Crashlytics
 * collection and `createMixpanelAnalyticsService()` calls `init()`, and those
 * now happen once, at a point the caller chose.
 *
 * Three backends now. `api` is being built out one slice at a time, so it takes
 * its own auth service and keeps Firebase for everything not yet ported —
 * which is what lets the app stay runnable throughout the move.
 */
export function createServices(env: AppEnvironment = environment): Services {
  const mock = env === 'mock';
  const api = env === 'api';

  const built: Services = mock
    ? {
        activities: mockActivitiesService,
        auth: mockAuthService,
        notes: mockNotesService,
        onboarding: mockOnboardingService,
        sessions: mockSessionsService,
        settings: mockSettingsService,
        consent: mockConsentService,
        training: mockTrainingService,
        trends: mockTrendsService,
        user: mockUserService,
        analytics: mockAnalyticsService,
        crash: mockCrashService,
      }
    : {
        activities: api ? apiActivitiesService : firebaseActivitiesService,
        auth: api ? apiAuthService : firebaseAuthService,
        notes: firebaseNotesService,
        onboarding: api ? apiOnboardingService : firebaseOnboardingService,
        sessions: api ? apiSessionsService : firebaseSessionsService,
        /* Firebase never had threshold figures, so it shares the mock
           implementation rather than getting an empty one of its own. */
        settings: api ? apiSettingsService : mockSettingsService,
        consent: api ? apiConsentService : firebaseConsentService,
        training: api ? apiTrainingService : firebaseTrainingService,
        trends: api ? apiTrendsService : firebaseTrendsService,
        user: api ? apiUserService : firebaseUserService,
        /*
         * `mixpanelToken` is read from the module, not derived from `env`, and
         * has to be: Metro inlines `EXPO_PUBLIC_*` by substituting the literal
         * source text at bundle time, so a token looked up from a variable is
         * never substituted and reads as undefined at runtime.
         *
         * No token configured means no `.env.local`: log to the console rather
         * than fail on launch.
         */
        analytics: mixpanelToken
          ? createMixpanelAnalyticsService(mixpanelToken)
          : mockAnalyticsService,
        crash: createFirebaseCrashService(),
      };

  /*
   * Hand the two telemetry implementations to the registry the facade reads.
   *
   * The facade cannot read this file — it imports every implementation, and
   * several of those import the facade back — so the root pushes its choice
   * down instead of the facade pulling it up. See `telemetry/registry.ts`.
   */
  setTelemetryServices({ analytics: built.analytics, crash: built.crash });

  return built;
}
