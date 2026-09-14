/**
 * Composition root.
 *
 * The single place where an environment is turned into concrete dependencies.
 * `_layout.tsx` injects these into the providers, so the wiring stays visible
 * rather than hidden behind defaults.
 */
import { isApi, isMock, mixpanelToken } from '@/config/environment';
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

/*
 * Three backends now. `api` is being built out one slice at a time, so it takes
 * its own auth service and keeps Firebase for everything not yet ported —
 * which is what lets the app stay runnable throughout the move.
 */
export const services: Services = isMock
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
      activities: isApi ? apiActivitiesService : firebaseActivitiesService,
      auth: isApi ? apiAuthService : firebaseAuthService,
      notes: firebaseNotesService,
      onboarding: isApi ? apiOnboardingService : firebaseOnboardingService,
      sessions: isApi ? apiSessionsService : firebaseSessionsService,
      /* Firebase never had threshold figures, so it shares the mock
         implementation rather than getting an empty one of its own. */
      settings: isApi ? apiSettingsService : mockSettingsService,
      consent: isApi ? apiConsentService : firebaseConsentService,
      training: isApi ? apiTrainingService : firebaseTrainingService,
      trends: isApi ? apiTrendsService : firebaseTrendsService,
      user: isApi ? apiUserService : firebaseUserService,
      /* No token configured means no `.env.local`: log to the console rather
         than fail on launch. */
      analytics: mixpanelToken
        ? createMixpanelAnalyticsService(mixpanelToken)
        : mockAnalyticsService,
      crash: createFirebaseCrashService(),
    };
