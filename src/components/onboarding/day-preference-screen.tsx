/**
 * "Which days do you prefer to swim/cycle/run?" — the same shape three
 * times: a discipline-accented `DayGrid` with a couple of days pre-marked
 * "recommended", an "Any day" switch that empties and disables the grid, and
 * a footnote explaining the asterisk.
 */
import { StyleSheet, Switch, View } from 'react-native';

import { OnboardingStep } from '../onboarding-step';
import { DayGrid, type Weekday } from './day-grid';
import { ThemedText } from '../themed-text';

import { Disciplines } from '@/constants/disciplines';
import type { Discipline } from '@/domain/training';

export function DayPreferenceScreen({
  discipline,
  title,
  progress,
  selected,
  onToggle,
  anyDay,
  onAnyDayChange,
  recommended,
  onNext,
}: {
  discipline: Extract<Discipline, 'swim' | 'run' | 'ride'>;
  title: string;
  progress: number;
  selected: Weekday[];
  onToggle: (day: Weekday) => void;
  anyDay: boolean;
  onAnyDayChange: (value: boolean) => void;
  recommended: Weekday[];
  onNext: () => void;
}) {
  const info = Disciplines[discipline];

  return (
    <OnboardingStep
      title={title}
      subtitle="This won't affect how much you'll train each week, just your flexibility when scheduling."
      progress={progress}
      onNext={onNext}>
      <DayGrid
        selected={selected}
        onToggle={onToggle}
        recommended={recommended}
        accent={{ color: info.accent, icon: info.icon }}
        disabled={anyDay}
      />

      <View style={styles.anyDayRow}>
        <ThemedText style={styles.anyDayLabel}>Any day</ThemedText>
        <Switch value={anyDay} onValueChange={onAnyDayChange} />
      </View>

      <ThemedText themeColor="textSecondary" style={styles.footnote}>
        * Recommended {info.label.toLowerCase()} day, based on your availability, experience, and goals
      </ThemedText>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  anyDayRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  anyDayLabel: {
    fontSize: 15,
    lineHeight: 19,
  },
  footnote: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 17,
  },
});
