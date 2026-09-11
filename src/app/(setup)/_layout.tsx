/**
 * The personalisation flow: verify email, then every screen collecting what
 * the plan needs, ending at the plan overview.
 *
 * Wrapped in its own `OnboardingFlowProvider` rather than the root's — this
 * state is scoped to one pass through the flow and has nothing to say once
 * the athlete reaches `(main)`.
 */
import { Stack } from 'expo-router';

import { OnboardingFlowProvider } from '@/providers/onboarding-flow-provider';

export const unstable_settings = { anchor: 'verify-email' };

export default function SetupLayout() {
  return (
    <OnboardingFlowProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingFlowProvider>
  );
}
