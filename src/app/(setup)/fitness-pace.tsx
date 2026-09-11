/**
 * Current fitness, part two: run and swim threshold pace, each a
 * minutes:seconds pair of wheels per /km or /100m.
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { CheckRow } from '@/components/onboarding/check-row';
import { FieldCaption } from '@/components/onboarding/field-caption';
import { WheelPicker } from '@/components/onboarding/wheel-picker';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

function PaceWheels({
  totalSeconds,
  onChange,
  unit,
}: {
  totalSeconds: number;
  onChange: (seconds: number) => void;
  unit: string;
}) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <View style={styles.paceRow}>
      <WheelPicker min={1} max={20} value={minutes} onChange={m => onChange(m * 60 + seconds)} width={70} />
      <ThemedText style={styles.colon}>:</ThemedText>
      <WheelPicker
        min={0}
        max={59}
        value={seconds}
        format={v => String(v).padStart(2, '0')}
        onChange={s => onChange(minutes * 60 + s)}
        width={70}
      />
      <ThemedText themeColor="textSecondary" style={styles.unit}>
        {unit}
      </ThemedText>
    </View>
  );
}

export default function FitnessPaceScreen() {
  useScreenTracking('Current fitness 2');
  const { answers, update } = useOnboardingFlow();

  return (
    <OnboardingStep
      title="Current fitness"
      subtitle="We'll use this to calculate your training zones and intensity"
      progress={stepProgress('fitness-pace', answers.hasRace)}
      onNext={() => router.push('/training-hours')}>
      <FieldCaption>Run Threshold Pace</FieldCaption>
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
        <FieldCaption>Swim Threshold Pace</FieldCaption>
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
  note: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  colon: {
    fontSize: 32,
    fontWeight: '600',
  },
  unit: {
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 17,
  },
  section: {
    marginTop: 30,
  },
});
