/**
 * Selectable capsule, one of a small set — the feedback categories here.
 *
 * Selection is carried by colour and fill together rather than by fill alone, so
 * it still reads for someone who cannot separate the accent from the neutral.
 */
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

import { AccentFillOpacity, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChoiceChipProps = {
  label: string;
  icon: SFSymbol;
  /** Hex accent worn when selected. Unselected chips are always neutral. */
  accent: string;
  selected: boolean;
  onPress: () => void;
};

export function ChoiceChip({ label, icon, accent, selected, onPress }: ChoiceChipProps) {
  const theme = useTheme();

  const color = selected ? accent : theme.text;
  const borderColor = selected ? accent : theme.backgroundSelected;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      /* The chip is 36pt to match the design; this restores the 44pt target
         without making the capsule taller. */
      hitSlop={{ top: Spacing.one, bottom: Spacing.one }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor,
          backgroundColor: selected ? `${accent}${AccentFillOpacity}` : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <SymbolView name={icon} size={15} tintColor={color} />
      {/* The longest label sets the row's fit; truncating rather than wrapping
          keeps every capsule the same height on a narrow screen. */}
      <ThemedText numberOfLines={1} style={[styles.label, { color }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    /* One of a row of choices, so they share the width evenly rather than each
       sizing to its own label — a segmented control, not a tag list. */
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    height: 36,
    paddingHorizontal: Spacing.one + 2,
    borderWidth: 1,
    /* Far larger than the height, which gives a true capsule whatever the
       label's line height turns out to be. */
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
});
