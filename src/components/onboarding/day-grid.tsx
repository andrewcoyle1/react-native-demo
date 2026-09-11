/**
 * The Mon-Sun grid used across the whole scheduling stretch of onboarding:
 * general availability, and per-discipline swim/cycle/run day preference.
 *
 * Two looks, one component. Plain availability days are a fixed white
 * checkbox on a neutral card; a discipline's preferred days add that
 * discipline's accent colour to the border, label and an icon, and the whole
 * grid can be disabled behind an "Any day" toggle — ticking it means every
 * day is equally fine, so there is nothing left to pick.
 *
 * Geometry measured from the design at 440pt: 3 columns, ~8pt gutters, cards
 * a little taller than wide, an 11pt caption size for the day label.
 */
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../themed-text';

import { useTheme } from '@/hooks/use-theme';

export const Weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type Weekday = (typeof Weekdays)[number];

type DayGridProps = {
  selected: Weekday[];
  onToggle: (day: Weekday) => void;
  /** Days the plan recommends, marked with an asterisk in the accent style. */
  recommended?: Weekday[];
  /** Adds the accent colour, an icon per cell, and switches the checkmark
      look from a checkbox to a pill. Omit for the plain availability grid. */
  accent?: { color: string; icon: SFSymbol };
  disabled?: boolean;
  /** Restricts which cells can be picked at all — the long-run/long-ride
      screen only offers the days already chosen as that discipline's
      preferred training days. Omit to allow every day. */
  enabledDays?: Weekday[];
};

export function DayGrid({
  selected,
  onToggle,
  recommended = [],
  accent,
  disabled,
  enabledDays,
}: DayGridProps) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {Weekdays.map(day => {
        const isOn = selected.includes(day);
        const isRecommended = recommended.includes(day);
        const isEnabled = !enabledDays || enabledDays.includes(day);
        const tint = accent && isOn ? accent.color : isEnabled ? theme.text : theme.textSecondary;

        return (
          <Pressable
            key={day}
            disabled={disabled || !isEnabled}
            onPress={() => onToggle(day)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isOn, disabled }}
            accessibilityLabel={day}
            style={({ pressed }) => [
              styles.cell,
              {
                borderColor: accent && isOn ? accent.color : theme.backgroundSelected,
                backgroundColor: accent && isOn ? `${accent.color}1A` : 'transparent',
              },
              (disabled || !isEnabled) && styles.disabled,
              pressed && !disabled && isEnabled && styles.pressed,
            ]}>
            {accent && isOn ? (
              <SymbolView name={accent.icon} size={14} weight="regular" tintColor={accent.color} />
            ) : null}
            <ThemedText style={[styles.label, { color: tint }]}>
              {day}
              {isRecommended ? '*' : ''}
            </ThemedText>
            <View
              style={[
                styles.check,
                {
                  borderColor: theme.textSecondary,
                  backgroundColor: isOn ? (accent ? accent.color : '#FFFFFF') : 'transparent',
                },
              ]}>
              {isOn ? (
                <SymbolView
                  name="checkmark"
                  size={12}
                  weight="bold"
                  tintColor={accent ? '#FFFFFF' : '#000000'}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    width: '30%',
    aspectRatio: 1.32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
