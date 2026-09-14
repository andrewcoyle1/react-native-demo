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

import { useAnalyticsConsentPrompt } from '@/hooks/use-analytics-consent';

import { OnboardingFlowProvider } from '@/providers/onboarding-flow-provider';

export const unstable_settings = { anchor: 'race-or-not' };

export default function SetupLayout() {
  /*
   * Asked here, at the top of personalisation, rather than after it.
   *
   * The twenty-odd screens below this one are the funnel most worth seeing, and
   * consent given afterwards cannot describe them — nothing is queued while
   * opted out, by design. Asking first costs some completion, because friction
   * before any investment loses more people than friction after twenty screens
   * of it; that cost is accepted deliberately, and is measured server-side
   * (accounts created versus onboarding completed) since consent-gated
   * analytics structurally cannot measure the effect of the consent prompt.
   */
  useAnalyticsConsentPrompt();

  return (
    <OnboardingFlowProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingFlowProvider>
  );
}
