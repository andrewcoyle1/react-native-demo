import { router } from 'expo-router';

import { AbilityScreen, type AbilityAnswer } from '@/components/onboarding/ability-screen';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

const distanceLabels = ["Can't swim yet", '< 500m', '500m - 1500m', '1500m - 3000m', '3000m+'];

export default function AbilitySwimScreen() {
  useScreenTracking('Swimming ability');
  const { answers, update } = useOnboardingFlow();

  const answer: AbilityAnswer = answers.ability.swim ?? {
    experience: 'beginner',
    distanceIndex: 0,
    notSure: false,
  };

  function set(next: AbilityAnswer) {
    update({ ability: { ...answers.ability, swim: next } });
  }

  return (
    <AbilityScreen
      discipline="swim"
      title="Swimming ability"
      progress={stepProgress('ability-swim', answers.hasRace)}
      sessionChips={["I don't swim regularly", '< 1000 m/yd', '1000 - 3000 m/yd', '3000+ m/yd']}
      distanceLabels={distanceLabels}
      distancePrompt="Select the distance you can swim continuously without stopping"
      answer={answer}
      onChange={set}
      onNext={() => router.push('/ability-run')}
    />
  );
}
