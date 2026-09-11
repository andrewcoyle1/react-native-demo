import { router } from 'expo-router';

import { DayPreferenceScreen } from '@/components/onboarding/day-preference-screen';
import type { Weekday } from '@/components/onboarding/day-grid';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

export default function CycleDaysScreen() {
  useScreenTracking('Cycle days');
  const { answers, update } = useOnboardingFlow();
  const selected = answers.preferredDays.ride ?? (['WED', 'SAT'] as Weekday[]);
  const anyDay = selected.length === 0;

  function toggle(day: Weekday) {
    const on = selected.includes(day);
    update({ preferredDays: { ...answers.preferredDays, ride: on ? selected.filter(d => d !== day) : [...selected, day] } });
  }

  return (
    <DayPreferenceScreen
      discipline="ride"
      title="Which days do you prefer to cycle?"
      progress={stepProgress('cycle-days', answers.hasRace)}
      selected={selected}
      onToggle={toggle}
      anyDay={anyDay}
      onAnyDayChange={value => update({ preferredDays: { ...answers.preferredDays, ride: value ? [] : ['WED', 'SAT'] } })}
      recommended={['WED', 'SAT']}
      onNext={() => router.push('/run-days')}
    />
  );
}
