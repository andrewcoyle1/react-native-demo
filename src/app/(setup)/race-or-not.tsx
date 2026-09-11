/**
 * The personalisation flow's first screen: a race in mind, or not.
 *
 * Two tall cards, no "Next" — tapping either one both records the answer and
 * advances, which is why `OnboardingStep` is given `showNext={false}` here.
 * The two paths rejoin at `ability-swim`; see `flow-order.ts`.
 *
 * This is also `(setup)`'s anchor route, reached straight from the root gate
 * rather than pushed onto a stack that has anywhere to go back to — the
 * default back button's `router.back()` would throw ("GO_BACK was not
 * handled"). Signing out is the only sensible "back" from here: the athlete
 * has an account but no profile yet, and leaving returns them to a place they
 * can come back to setup from, exactly where sign-up left them.
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { SelectableCard } from '@/components/onboarding/selectable-card';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useAuth } from '@/providers/auth-provider';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';
import { reportError } from '@/services/telemetry';

import { stepProgress } from './flow-order';

export default function RaceOrNotScreen() {
  useScreenTracking('Race or not');
  const { update } = useOnboardingFlow();
  const { signOut } = useAuth();

  function choose(hasRace: boolean) {
    update({ hasRace });
    router.push(hasRace ? '/plan-select' : '/choose-goal');
  }

  async function back() {
    try {
      await signOut();
      // No navigation needed: clearing `user` flips the root gate back to
      // `(onboarding)`, the same way it does everywhere else sign-out happens.
    } catch (caught) {
      reportError(caught, 'auth: signOut (setup back)');
    }
  }

  return (
    <OnboardingStep
      title="Do you have a race in mind?"
      subtitle="Choose your current training focus"
      progress={stepProgress('race-or-not', null)}
      showNext={false}
      onNext={() => {}}
      onBack={back}>
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
