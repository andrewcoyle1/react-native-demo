/**
 * The "no race planned" branch's own question: what the training is for,
 * since there is no event to aim it at.
 */
import { router } from 'expo-router';
import { Icon } from '@/components/icon';
import { StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { SelectableCard } from '@/components/onboarding/selectable-card';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow, type TrainingGoal } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';
import { useCompleteSetupStep } from './use-step-tracking';

const Goals: { key: TrainingGoal; title: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'fitness',
    title: 'Improve overall fitness',
    description: 'Get stronger and faster across swimming, cycling, and running',
    icon: <Icon name="heart.text.square" size={20} tintColor="#3FB984" />,
  },
  {
    key: 'weight',
    title: 'Lose weight',
    description: 'Use triathlon training to reach your target weight',
    icon: <Icon name="figure" size={20} tintColor="#E5B93F" />,
  },
  {
    key: 'future-season',
    title: 'Prepare for future race season',
    description: 'Stay active and maintain base fitness until next season',
    icon: <Icon name="chevron.right.2" size={20} tintColor="#6C7CE5" />,
  },
];

export default function ChooseGoalScreen() {
  useScreenTracking('Choose goal');
  const { update } = useOnboardingFlow();
  const completeStep = useCompleteSetupStep();

  function choose(goal: TrainingGoal) {
    update({ goal });
    completeStep();
    router.push('/ability-swim');
  }

  return (
    <OnboardingStep
      title="Choose your goal"
      subtitle="Select what you'd like to achieve through your training"
      progress={stepProgress('choose-goal', false)}
      showNext={false}
      onNext={() => {}}>
      <View style={styles.stack}>
        {Goals.map(goal => (
          <SelectableCard
            key={goal.key}
            icon={goal.icon}
            title={goal.title}
            description={goal.description}
            onPress={() => choose(goal.key)}
            style={styles.card}
          />
        ))}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  card: {
    height: 196,
    justifyContent: 'center',
  },
});
