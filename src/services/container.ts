/**
 * Composition root.
 *
 * The single place where an environment is turned into concrete dependencies.
 * `_layout.tsx` injects these into the providers, so the wiring stays visible
 * rather than hidden behind defaults.
 */
import { isMock } from '@/config/environment';
import type { AuthService } from '@/providers/auth-provider/services/auth-service';
import { firebaseAuthService } from '@/providers/auth-provider/services/firebase-auth-service';
import { mockAuthService } from '@/providers/auth-provider/services/mock-auth-service';
import { firebaseNotesService } from '@/providers/notes-provider/services/firebase-notes-service';
import { mockNotesService } from '@/providers/notes-provider/services/mock-notes-service';
import type { NotesService } from '@/providers/notes-provider/services/notes-service';
import { firebaseUserService } from '@/providers/user-provider/services/firebase-user-service';
import { mockUserService } from '@/providers/user-provider/services/mock-user-service';
import type { UserService } from '@/providers/user-provider/services/user-service';
import { createFirebaseTelemetryService } from '@/services/telemetry/firebase-telemetry-service';
import { mockTelemetryService } from '@/services/telemetry/mock-telemetry-service';
import type { TelemetryService } from '@/services/telemetry/telemetry-service';

export type Services = {
  auth: AuthService;
  notes: NotesService;
  user: UserService;
  telemetry: TelemetryService;
};

export const services: Services = isMock
  ? {
      auth: mockAuthService,
      notes: mockNotesService,
      user: mockUserService,
      telemetry: mockTelemetryService,
    }
  : {
      auth: firebaseAuthService,
      notes: firebaseNotesService,
      user: firebaseUserService,
      telemetry: createFirebaseTelemetryService(),
    };
