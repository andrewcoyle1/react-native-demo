/**
 * The live analytics and crash implementations, and the only thing the facade
 * reads.
 *
 * This module exists to break an import cycle. The facade used to read the
 * composition root directly, and the composition root imports every service
 * implementation — several of which import the facade back, for a breadcrumb or
 * an error report:
 *
 *   telemetry/index.ts → services/container.ts
 *     → auth-provider/services/api-auth-service.ts → shared/pending-writes.ts
 *       → telemetry/index.ts
 *
 * Metro allows cycles but warns that they can yield uninitialised values, and
 * `shared/remote-state.ts`, `paged-state.ts` and `sync-state.ts` close the same
 * loop by three more routes. Inverting it here costs one small module: this file
 * imports nothing but its own types and the mocks, so nothing that reaches it
 * can reach the container.
 *
 * `createServices` calls `setTelemetryServices` as it builds, so the choice of
 * implementation still belongs to the composition root — this only holds the
 * answer.
 */
import { mockAnalyticsService, mockCrashService } from './mock-telemetry-services';
import type { AnalyticsService, CrashService } from './telemetry-service';

/*
 * The mocks, not null, so a call made before wiring logs to the console rather
 * than throwing. Telemetry must never be the thing that breaks a user flow —
 * the same rule `swallow` follows.
 *
 * It does mean a premature call is silently dropped, so in any environment with
 * a real vendor, `[telemetry:mock]` in the log means something ran too early.
 */
let analytics: AnalyticsService = mockAnalyticsService;
let crash: CrashService = mockCrashService;

/** Called once, by `createServices`. */
export function setTelemetryServices(next: { analytics: AnalyticsService; crash: CrashService }) {
  analytics = next.analytics;
  crash = next.crash;
}

/**
 * Getters rather than exported values: the facade and the `shared/*` helpers
 * capture this at import time, and a plain export would freeze whatever was in
 * place then — which is always the mock.
 */
export const telemetry = {
  get analytics(): AnalyticsService {
    return analytics;
  },
  get crash(): CrashService {
    return crash;
  },
};
