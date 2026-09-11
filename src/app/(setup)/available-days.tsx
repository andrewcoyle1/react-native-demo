/**
 * "What days can you train?" — the plain availability grid, every day
 * checked by default. No discipline accent: this is the umbrella the
 * per-discipline preference screens narrow from.
 */
import { router } from 'expo-router';

import { OnboardingStep } from '@/components/onboarding-step';
import { DayGrid, Weekdays, type Weekday } from '@/components/onboarding/day-grid';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';
import { StyleSheet } from 'react-native';

import { stepProgress } from './flow-order';

export default function AvailableDaysScreen() {
  useScreenTracking('Available days');
  const { answers, update } = useOnboardingFlow();

  function toggle(day: Weekday) {
    const on = answers.availableDays.includes(day);
    update({
      availableDays: on
        ? answers.availableDays.filter(d => d !== day)
        : Weekdays.filter(d => answers.availableDays.includes(d) || d === day),
    });
  }

  return (
    <OnboardingStep
      title="What days can you train?"
      subtitle="Select the days you are available to train on"
      progress={stepProgress('available-days', answers.hasRace)}
      onNext={() => router.push('/swim-days')}>
      <DayGrid selected={answers.availableDays} onToggle={toggle} />
      <ThemedText themeColor="textSecondary" style={styles.footnote}>
        p.s. You can always change these later
      </ThemedText>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  footnote: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
});
