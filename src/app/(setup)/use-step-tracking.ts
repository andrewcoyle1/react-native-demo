/**
 * The personalisation funnel.
 *
 * `screen_viewed` already fires on every screen here, but it cannot carry a
 * funnel on its own: it re-fires when the athlete taps back, so a step reads as
 * reached twice and the drop-off between two steps stops meaning anything.
 * `setup_step_completed` is the forward-only counterpart — it fires when the
 * athlete *advances*, so consecutive steps divide into a real conversion rate.
 *
 * The step name comes from the route rather than a prop, so it cannot drift
 * from the twenty-six screens it describes, and nobody has to remember to pass
 * it. It is a property value and not part of the event name, which is what the
 * "never build an event name at runtime" rule asks for.
 */
import { usePathname } from 'expo-router';
import { useCallback } from 'react';

import { orderFor } from './flow-order';

import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';
import { trackEvent } from '@/services/telemetry';

/**
 * `hasRace` may be overridden because `race-or-not` is the screen that decides
 * it: it records the answer and advances in the same tick, so the value this
 * hook closed over at render is still null at the moment the event fires.
 * Every later screen has it already and passes nothing.
 */
export function useCompleteSetupStep(): (override?: { hasRace: boolean }) => void {
  const pathname = usePathname();
  const { answers, mode } = useOnboardingFlow();
  const hasRace = answers.hasRace;

  return useCallback(
    (override?: { hasRace: boolean }) => {
      const decided = override?.hasRace ?? hasRace;
      const step = pathname.replace(/^\//, '');
      /*
       * The two flows are different funnels — one picks a race and its goal, the
       * other a training goal — so a drop-off rate that averages them describes
       * neither. Omitted rather than sent as null before the athlete has answered
       * the first question, which is the house rule for a property that does not
       * apply yet.
       */
      const flow = decided === null ? undefined : decided ? 'race' : 'no_race';
      const order = orderFor(mode, decided);
      const index = order.indexOf(step);

      trackEvent('setup_step_completed', {
        step,
        flow,
        /*
         * A first plan and a later one are different funnels through some of
         * the same screens — one is twenty-four steps and the other six — so a
         * conversion rate that averages them describes neither. Same reasoning
         * as `flow` above, one level up.
         */
        setup_mode: mode === 'add-plan' ? 'add_plan' : 'onboarding',
        // 1-based: "step 3 of 24" is how the funnel reads, and a 0 here would
        // be indistinguishable from the not-found case beside it.
        step_number: index === -1 ? undefined : index + 1,
        step_count: order.length,
      });
    },
    [pathname, hasRace, mode],
  );
}
