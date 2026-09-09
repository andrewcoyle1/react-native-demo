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
import { createFirebaseTelemetryService } from '@/services/telemetry/firebase-telemetry-service';
import { mockTelemetryService } from '@/services/telemetry/mock-telemetry-service';
import type { TelemetryService } from '@/services/telemetry/telemetry-service';

export type Services = {
  auth: AuthService;
  notes: NotesService;
  telemetry: TelemetryService;
};

export const services: Services = isMock
  ? {
      auth: mockAuthService,
      notes: mockNotesService,
      telemetry: mockTelemetryService,
    }
  : {
      auth: firebaseAuthService,
      notes: firebaseNotesService,
      telemetry: createFirebaseTelemetryService(),
    };
