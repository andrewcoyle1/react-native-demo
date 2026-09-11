/**
 * The personalisation flow's first screen: a race in mind, or not.
 *
 * Two tall cards, no "Next" — tapping either one both records the answer and
 * advances, which is why `OnboardingStep` is given `showNext={false}` here.
 * The two paths rejoin at `ability-swim`; see `flow-order.ts`.
 */
import { router } from 'expo-router';

import { OnboardingStep } from '@/components/onboarding-step';
import { SelectableCard } from '@/components/onboarding/selectable-card';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';
import { StyleSheet, View } from 'react-native';

import { stepProgress } from './flow-order';

export default function RaceOrNotScreen() {
  useScreenTracking('Race or not');
  const { update } = useOnboardingFlow();

  function choose(hasRace: boolean) {
    update({ hasRace });
    router.push(hasRace ? '/plan-select' : '/choose-goal');
  }

  return (
    <OnboardingStep
      title="Do you have a race in mind?"
      subtitle="Choose your current training focus"
      progress={stepProgress('race-or-not', null)}
      showNext={false}
      onNext={() => {}}>
      <View style={styles.stack}>
        <SelectableCard
          icon={<ThemedText style={styles.emoji}>🏁</ThemedText>}
          title="Race"
          description="Training with a specific event in mind"
          onPress={() => choose(true)}
          style={styles.card}
        />
        <SelectableCard
          icon={<ThemedText style={styles.emoji}>📆</ThemedText>}
          title="No race planned"
          description="Laying groundwork for future races"
          onPress={() => choose(false)}
          style={styles.card}
        />
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  card: {
    height: 236,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
    lineHeight: 25,
  },
});
