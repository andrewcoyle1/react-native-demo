/**
 * `OnboardingService` for the mock environment.
 *
 * Every mock account except the reserved empty uid already carries seeded
 * plans, races and sessions (see `mock-training-service.ts`) regardless of
 * onboarding, so there is nothing here to generate. All this needs to do is
 * the one write that actually gates the root navigator: flipping the profile
 * from `absent` to `ready`.
 */
import type { OnboardingService } from './onboarding-service';

import { mockUserService } from '@/providers/user-provider/services/mock-user-service';

export const mockOnboardingService: OnboardingService = {
  async complete(uid, draft) {
    await mockUserService.create(uid, draft.profile);
  },
};
