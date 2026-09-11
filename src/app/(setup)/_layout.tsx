/**
 * The personalisation flow: every screen collecting what the plan needs,
 * from "Do you have a race in mind?" through the plan overview.
 *
 * Email verification is `(onboarding)/verify-email`, not here — it is still
 * part of account creation, drawn with that flow's shell rather than this
 * one's progress bar (see its own file header), and is not yet part of the
 * enforced path the root gate takes a signed-up athlete down.
 *
 * Wrapped in its own `OnboardingFlowProvider` rather than the root's — this
 * state is scoped to one pass through the flow and has nothing to say once
 * the athlete reaches `(main)`.
 */
import { Stack } from 'expo-router';

import { OnboardingFlowProvider } from '@/providers/onboarding-flow-provider';

export const unstable_settings = { anchor: 'race-or-not' };

export default function SetupLayout() {
  return (
    <OnboardingFlowProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingFlowProvider>
  );
}
