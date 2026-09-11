/**
 * "How many hours do you currently train each week?" — a plain radio list of
 * bands rather than a wheel, since the design treats this as a coarse
 * self-assessment, not a precise number.
 */
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

const Bands = [
  { key: 'lt5', title: 'Less than 5 hours', subtitle: 'New to triathlon or returning after a break' },
  { key: '5-8', title: '5 to 8 hours', subtitle: 'Regular training with some experience' },
  { key: '8-10', title: '8 to 10 hours', subtitle: 'Consistent training routine established' },
  { key: '10-12', title: '10 to 12 hours', subtitle: 'Serious athlete with dedicated training time' },
  { key: '12-14', title: '12 to 14 hours', subtitle: 'Elite level training commitment' },
];

export default function TrainingHoursScreen() {
  useScreenTracking('Training hours');
  const theme = useTheme();
  const { answers, update } = useOnboardingFlow();

  return (
    <OnboardingStep
      title="How many hours do you currently train each week?"
      subtitle="Your plan will build from your current training volume"
      progress={stepProgress('training-hours', answers.hasRace)}
      nextDisabled={!answers.weeklyHoursBand}
      onNext={() => router.push('/available-days')}>
      <View style={styles.list}>
        {Bands.map(band => {
          const active = answers.weeklyHoursBand === band.key;
          return (
            <Pressable
              key={band.key}
              onPress={() => update({ weeklyHoursBand: band.key })}
              style={[
                styles.row,
                {
                  borderColor: active ? '#3FB984' : theme.backgroundSelected,
                  backgroundColor: active ? 'rgba(63,185,132,0.12)' : 'transparent',
                },
              ]}>
              <View style={styles.rowText}>
                <ThemedText style={styles.title}>{band.title}</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                  {band.subtitle}
                </ThemedText>
              </View>
              {active ? <SymbolView name="checkmark.circle.fill" size={22} tintColor="#3FB984" /> : null}
            </Pressable>
          );
        })}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
