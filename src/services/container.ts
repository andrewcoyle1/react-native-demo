/**
 * Composition root.
 *
 * The single place where an environment is turned into concrete dependencies.
 * `_layout.tsx` injects these into the providers, so the wiring stays visible
 * rather than hidden behind defaults.
 */
import { isApi, isMock } from '@/config/environment';
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
import { createFirebaseTelemetryService } from '@/services/telemetry/firebase-telemetry-service';
import { mockTelemetryService } from '@/services/telemetry/mock-telemetry-service';
import type { TelemetryService } from '@/services/telemetry/telemetry-service';

export type Services = {
  activities: ActivitiesService;
  auth: AuthService;
  notes: NotesService;
  sessions: SessionsService;
  training: TrainingService;
  user: UserService;
  telemetry: TelemetryService;
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
      sessions: mockSessionsService,
      training: mockTrainingService,
      user: mockUserService,
      telemetry: mockTelemetryService,
    }
  : {
      activities: firebaseActivitiesService,
      auth: isApi ? apiAuthService : firebaseAuthService,
      notes: firebaseNotesService,
      sessions: firebaseSessionsService,
      training: isApi ? apiTrainingService : firebaseTrainingService,
      user: isApi ? apiUserService : firebaseUserService,
      telemetry: createFirebaseTelemetryService(),
    };
