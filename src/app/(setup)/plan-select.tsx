/**
 * "Choose your triathlon plan" — the four plan-distance cards.
 *
 * A middle-distance choice needs a specific race, so it is the only one that
 * goes on to `find-race`; the other three distances have nothing further to
 * search for and skip straight to the ability screens.
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { PlanCard, PlanDistances } from '@/components/onboarding/plan-card';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

export default function PlanSelectScreen() {
  useScreenTracking('Plan select');
  const { answers, update } = useOnboardingFlow();

  function choose(key: (typeof PlanDistances)[number]['key']) {
    update({ planDistance: key });
    router.push(key === 'middle' ? '/find-race' : '/ability-swim');
  }

  return (
    <OnboardingStep
      title="Choose your triathlon plan"
      subtitle="Choose the right plan for your upcoming race"
      progress={stepProgress('plan-select', true)}
      showNext={false}
      onNext={() => {}}>
      <View style={styles.grid}>
        <View style={styles.row}>
          <PlanCard
            info={PlanDistances[0]!}
            selected={answers.planDistance === 'long'}
            onPress={() => choose('long')}
          />
          <PlanCard
            info={PlanDistances[1]!}
            selected={answers.planDistance === 'middle'}
            onPress={() => choose('middle')}
          />
        </View>
        <View style={styles.row}>
          <PlanCard
            info={PlanDistances[2]!}
            selected={answers.planDistance === 'olympic'}
            onPress={() => choose('olympic')}
          />
          <PlanCard
            info={PlanDistances[3]!}
            selected={answers.planDistance === 'sprint'}
            onPress={() => choose('sprint')}
          />
        </View>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
});
