/**
 * "Which days have limited training time?" — the plain grid again, this time
 * with nothing pre-selected: marking a day here means only one short session
 * fits, not the usual full slot.
 */
import { router } from 'expo-router';

import { OnboardingStep } from '@/components/onboarding-step';
import { DayGrid, type Weekday } from '@/components/onboarding/day-grid';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

export default function LimitedDaysScreen() {
  useScreenTracking('Limited days');
  const { answers, update } = useOnboardingFlow();

  function toggle(day: Weekday) {
    const on = answers.limitedDays.includes(day);
    update({ limitedDays: on ? answers.limitedDays.filter(d => d !== day) : [...answers.limitedDays, day] });
  }

  return (
    <OnboardingStep
      title="Which days have limited training time?"
      subtitle="Select days where you can only fit in one training session"
      progress={stepProgress('limited-days', answers.hasRace)}
      onNext={() => router.push('/weekly-commitments')}>
      <DayGrid selected={answers.limitedDays} onToggle={toggle} />
    </OnboardingStep>
  );
}
