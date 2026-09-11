/**
 * Current fitness, part one: heart-rate range (two side-by-side wheels) and
 * cycling FTP (a single three-digit wheel).
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

export default function FitnessHeartFtpScreen() {
  useScreenTracking('Current fitness 1');
  const { answers, update } = useOnboardingFlow();

  return (
    <OnboardingStep
      title="Current fitness"
      subtitle="We'll use this to calculate your training zones and intensity"
      progress={stepProgress('fitness-heart-ftp', answers.hasRace)}
      onNext={() => router.push('/fitness-pace')}>
      <FieldCaption>Heart Rate Range</FieldCaption>
      <View style={styles.hrRow}>
        <View style={styles.hrColumn}>
          <ThemedText themeColor="textSecondary" style={styles.hrHeader}>
            Min
          </ThemedText>
          <WheelPicker
            min={30}
            max={announceMax(answers.heartRateMax)}
            value={answers.heartRateMin}
            onChange={heartRateMin => update({ heartRateMin })}
          />
          <ThemedText themeColor="textSecondary" style={styles.unit}>
            bpm
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.dash}>
          —
        </ThemedText>
        <View style={styles.hrColumn}>
          <ThemedText themeColor="textSecondary" style={styles.hrHeader}>
            Max
          </ThemedText>
          <WheelPicker
            min={answers.heartRateMin}
            max={230}
            value={answers.heartRateMax}
            onChange={heartRateMax => update({ heartRateMax })}
          />
          <ThemedText themeColor="textSecondary" style={styles.unit}>
            bpm
          </ThemedText>
        </View>
      </View>

      <View style={styles.checkGap}>
        <CheckRow
          label="I don't know my heart rate range"
          checked={answers.heartRateUnknown}
          onToggle={() => update({ heartRateUnknown: !answers.heartRateUnknown })}
        />
      </View>

      <View style={styles.section}>
        <FieldCaption>Cycling Threshold Power (FTP)</FieldCaption>
        <ThemedText themeColor="textSecondary" style={styles.note}>
          ⓘ The highest avg. power you can sustain for ~60 minutes
        </ThemedText>
        <View style={styles.ftpRow}>
          <WheelPicker min={80} max={500} value={answers.cyclingFtp} onChange={cyclingFtp => update({ cyclingFtp })} />
          <ThemedText themeColor="textSecondary" style={styles.unit}>
            W
          </ThemedText>
        </View>
        <CheckRow
          label="I don't know my cycling threshold power (FTP)"
          checked={answers.cyclingFtpUnknown}
          onToggle={() => update({ cyclingFtpUnknown: !answers.cyclingFtpUnknown })}
        />
      </View>
    </OnboardingStep>
  );
}

function announceMax(max: number) {
  return Math.max(30, max - 1);
}

const styles = StyleSheet.create({
  hrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  hrColumn: {
    alignItems: 'center',
  },
  hrHeader: {
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 4,
  },
  unit: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  dash: {
    fontSize: 20,
    marginTop: 24,
  },
  checkGap: {
    marginTop: 16,
  },
  section: {
    marginTop: 30,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  ftpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
});
