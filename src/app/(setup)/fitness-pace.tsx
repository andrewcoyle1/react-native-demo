/**
 * Current fitness, part two: run and swim threshold pace, each a
 * minutes:seconds pair of wheels per /km or /100m.
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { PaceWheels } from '@/components/pace-wheels';
import { CheckRow } from '@/components/onboarding/check-row';
import { FieldCaption } from '@/components/onboarding/field-caption';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

export default function FitnessPaceScreen() {
  useScreenTracking('Current fitness 2');
  const { answers, update } = useOnboardingFlow();

  return (
    <OnboardingStep
      title="Current fitness"
      subtitle="We'll use this to calculate your training zones and intensity"
      progress={stepProgress('fitness-pace', answers.hasRace)}
      onNext={() => router.push('/training-hours')}>
      <FieldCaption style={styles.caption}>Run Threshold Pace</FieldCaption>
      <ThemedText themeColor="textSecondary" style={styles.note}>
        ⓘ The fastest avg. pace you can hold for ~60 minutes
      </ThemedText>
      <PaceWheels
        totalSeconds={answers.runPaceSecondsPerKm}
        onChange={runPaceSecondsPerKm => update({ runPaceSecondsPerKm })}
        unit="/km"
      />
      <CheckRow
        label="I don't know my run threshold pace"
        checked={answers.runPaceUnknown}
        onToggle={() => update({ runPaceUnknown: !answers.runPaceUnknown })}
      />

      <View style={styles.section}>
        <FieldCaption style={styles.caption}>Swim Threshold Pace</FieldCaption>
        <ThemedText themeColor="textSecondary" style={styles.note}>
          ⓘ The fastest avg. pace you can hold for ~30 minutes
        </ThemedText>
        <PaceWheels
          totalSeconds={answers.swimPaceSecondsPer100m}
          onChange={swimPaceSecondsPer100m => update({ swimPaceSecondsPer100m })}
          unit="/100m"
        />
        <CheckRow
          label="I don't know my swim threshold pace"
          checked={answers.swimPaceUnknown}
          onToggle={() => update({ swimPaceUnknown: !answers.swimPaceUnknown })}
        />
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  caption: {
    width: '100%',
    textAlign: 'center',
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  section: {
    marginTop: 30,
  },
});
