import { router } from 'expo-router';

import { DayPreferenceScreen } from '@/components/onboarding/day-preference-screen';
import type { Weekday } from '@/components/onboarding/day-grid';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

export default function RunDaysScreen() {
  useScreenTracking('Run days');
  const { answers, update } = useOnboardingFlow();
  const selected = answers.preferredDays.run ?? (['THU', 'SUN'] as Weekday[]);
  const anyDay = selected.length === 0;

  function toggle(day: Weekday) {
    const on = selected.includes(day);
    update({ preferredDays: { ...answers.preferredDays, run: on ? selected.filter(d => d !== day) : [...selected, day] } });
  }

  return (
    <DayPreferenceScreen
      discipline="run"
      title="Which days do you prefer to run?"
      progress={stepProgress('run-days', answers.hasRace)}
      selected={selected}
      onToggle={toggle}
      anyDay={anyDay}
      onAnyDayChange={value => update({ preferredDays: { ...answers.preferredDays, run: value ? [] : ['THU', 'SUN'] } })}
      recommended={['THU', 'SUN']}
      onNext={() => router.push('/long-days')}
    />
  );
}
