import { router } from 'expo-router';

import { AbilityScreen, type AbilityAnswer } from '@/components/onboarding/ability-screen';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

const distanceLabels = ['Less than 3km', '3km - 5km', '5km - 10km', '10km - 21km', '21km+'];

export default function AbilityRunScreen() {
  useScreenTracking('Running ability');
  const { answers, update } = useOnboardingFlow();

  const answer: AbilityAnswer = answers.ability.run ?? {
    experience: 'beginner',
    distanceIndex: 0,
    notSure: false,
  };

  function set(next: AbilityAnswer) {
    update({ ability: { ...answers.ability, run: next } });
  }

  return (
    <AbilityScreen
      discipline="run"
      title="Running ability"
      progress={stepProgress('ability-run', answers.hasRace)}
      experienceNote="Can complete a 5km run without stopping, in under 60 minutes"
      distanceLabels={distanceLabels}
      distancePrompt="Select the distance you can currently run"
      answer={answer}
      onChange={set}
      onNext={() => router.push('/ability-cycle')}
    />
  );
}
