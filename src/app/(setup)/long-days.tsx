/**
 * "Which days do you want to do your long run and long ride?" — two single-
 * select grids, each restricted to the days already chosen for that
 * discipline on the preceding preference screens.
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { DayGrid, Weekdays, type Weekday } from '@/components/onboarding/day-grid';
import { FieldCaption } from '@/components/onboarding/field-caption';
import { ThemedText } from '@/components/themed-text';
import { Disciplines } from '@/constants/disciplines';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

export default function LongDaysScreen() {
  useScreenTracking('Long days');
  const { answers, update } = useOnboardingFlow();

  const rideOptions = answers.preferredDays.ride?.length ? answers.preferredDays.ride : [...Weekdays];
  const runOptions = answers.preferredDays.run?.length ? answers.preferredDays.run : [...Weekdays];

  return (
    <OnboardingStep
      title="Which days do you want to do your long run and long ride?"
      progress={stepProgress('long-days', answers.hasRace)}
      onNext={() => router.push('/limited-days')}>
      <View style={styles.section}>
        <View style={styles.captionRow}>
          <ThemedText style={styles.icon}>🚴</ThemedText>
          <FieldCaption>Long ride day</FieldCaption>
        </View>
        <DayGrid
          selected={answers.longRideDay ? [answers.longRideDay] : []}
          onToggle={(day: Weekday) => update({ longRideDay: answers.longRideDay === day ? null : day })}
          enabledDays={rideOptions}
          accent={{ color: Disciplines.ride.accent, icon: Disciplines.ride.icon }}
        />
        <ThemedText themeColor="textSecondary" style={styles.hint}>
          Prefer for long rides
        </ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.captionRow}>
          <ThemedText style={styles.icon}>🏃</ThemedText>
          <FieldCaption>Long run day</FieldCaption>
        </View>
        <DayGrid
          selected={answers.longRunDay ? [answers.longRunDay] : []}
          onToggle={(day: Weekday) => update({ longRunDay: answers.longRunDay === day ? null : day })}
          enabledDays={runOptions}
          accent={{ color: Disciplines.run.accent, icon: Disciplines.run.icon }}
        />
        <ThemedText themeColor="textSecondary" style={styles.hint}>
          Prefer for long runs
        </ThemedText>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 30,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: -2,
  },
  icon: {
    fontSize: 14,
  },
  hint: {
    marginTop: 12,
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 17,
  },
});
