/**
 * `OnboardingService` for the legacy Firestore backend (`dev` / `prod`).
 *
 * Plan generation was never built on this backend — see the data-layer plan's
 * "backend authors the plan" decision, which was made with the Postgres API in
 * mind. Until this environment is retired, onboarding here does the one thing
 * it always did: create the profile, which is what flips the root gate from
 * `(setup)` to `(main)`. Metrics, schedule and a generated plan are the API
 * environment's gain, not a regression here — nothing on this path collected
 * them before either.
 */
import type { OnboardingService } from './onboarding-service';

import { firebaseUserService } from '@/providers/user-provider/services/firebase-user-service';

export const firebaseOnboardingService: OnboardingService = {
  async complete(uid, draft) {
    await firebaseUserService.create(uid, draft.profile);
  },
};
