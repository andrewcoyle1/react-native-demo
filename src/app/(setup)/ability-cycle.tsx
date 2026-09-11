import { router } from 'expo-router';

import { AbilityScreen, type AbilityAnswer } from '@/components/onboarding/ability-screen';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

const distanceLabels = ['Less than 10km', '10km - 20km', '20km - 40km', '40km - 80km', '80km+'];

export default function AbilityCycleScreen() {
  useScreenTracking('Cycling ability');
  const { answers, update } = useOnboardingFlow();

  const answer: AbilityAnswer = answers.ability.ride ?? {
    experience: 'beginner',
    distanceIndex: 0,
    notSure: false,
  };

  function set(next: AbilityAnswer) {
    update({ ability: { ...answers.ability, ride: next } });
  }

  return (
    <AbilityScreen
      discipline="ride"
      title="Cycling ability"
      progress={stepProgress('ability-cycle', answers.hasRace)}
      experienceNote="Limited cycling experience, typically rides less than 20km at a time"
      distanceLabels={distanceLabels}
      distancePrompt="Select the distance you can currently ride"
      answer={answer}
      onChange={set}
      onNext={() => router.push('/personal-details')}
    />
  );
}
