import { router } from 'expo-router';

import { DayPreferenceScreen } from '@/components/onboarding/day-preference-screen';
import type { Weekday } from '@/components/onboarding/day-grid';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

export default function SwimDaysScreen() {
  useScreenTracking('Swim days');
  const { answers, update } = useOnboardingFlow();
  const selected = answers.preferredDays.swim ?? (['TUE', 'FRI'] as Weekday[]);
  const anyDay = selected.length === 0;

  function toggle(day: Weekday) {
    const on = selected.includes(day);
    update({ preferredDays: { ...answers.preferredDays, swim: on ? selected.filter(d => d !== day) : [...selected, day] } });
  }

  return (
    <DayPreferenceScreen
      discipline="swim"
      title="Which days do you prefer to swim?"
      progress={stepProgress('swim-days', answers.hasRace)}
      selected={selected}
      onToggle={toggle}
      anyDay={anyDay}
      onAnyDayChange={value => update({ preferredDays: { ...answers.preferredDays, swim: value ? [] : ['TUE', 'FRI'] } })}
      recommended={['TUE', 'FRI']}
      onNext={() => router.push('/cycle-days')}
    />
  );
}
