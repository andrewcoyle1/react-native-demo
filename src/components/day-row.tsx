/**
 * Seven day chips on one line, as the availability modal draws them.
 *
 * Deliberately not `onboarding/day-grid.tsx`: that is a three-column grid of
 * tall checkbox cards, sized for a full onboarding step with one question on
 * it. This modal stacks five of these rows inside a dialog, so each has to be a
 * single compact line — same question, an order of magnitude less room.
 *
 * Handles both shapes the design shows: a multi-select row (preferred swim,
 * cycle and run days) and a single-select one (the long ride and long run day),
 * which is `mode`. A day outside `enabledDays` is dimmed rather than hidden, so
 * the week keeps its shape and it stays obvious *why* a day cannot be picked —
 * you have not made it available yet.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Weekday } from '@/providers/settings-provider';

/** Monday first, which is how the design reads the week. */
const ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const LABELS: Record<Weekday, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

type DayRowProps = {
  selected: Weekday[];
  onChange: (days: Weekday[]) => void;
  /** Tints the selected chips. Omit for the neutral availability row. */
  accent?: string;
  /** `single` keeps at most one day, and tapping the chosen day clears it. */
  mode?: 'multi' | 'single';
  /** Days that can be picked at all. Omit to allow the whole week. */
  enabledDays?: Weekday[];
};

export function DayRow({
  selected,
  onChange,
  accent,
  mode = 'multi',
  enabledDays,
}: DayRowProps) {
  const theme = useTheme();
  const tint = accent ?? theme.text;

  function toggle(day: Weekday) {
    if (mode === 'single') {
      onChange(selected.includes(day) ? [] : [day]);
      return;
    }

    onChange(
      selected.includes(day)
        ? selected.filter(value => value !== day)
        : // Kept in week order rather than tap order, so what is stored reads
          // the same way the row does.
          ORDER.filter(value => value === day || selected.includes(value)),
    );
  }

  return (
    <View style={styles.row}>
      {ORDER.map(day => {
        const on = selected.includes(day);
        const enabled = !enabledDays || enabledDays.includes(day);

        return (
          <Pressable
            key={day}
            disabled={!enabled}
            onPress={() => toggle(day)}
            accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
            accessibilityState={{ checked: on, disabled: !enabled }}
            accessibilityLabel={LABELS[day]}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: on ? tint : theme.backgroundSelected,
                backgroundColor: on && accent ? `${accent}1A` : 'transparent',
              },
              !enabled && styles.disabled,
              pressed && enabled && styles.pressed,
            ]}>
            <ThemedText
              style={[styles.label, { color: on ? tint : theme.textSecondary }]}>
              {LABELS[day]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  chip: {
    /* Equal shares of the line, so the week reads as a single ruler. */
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
});
