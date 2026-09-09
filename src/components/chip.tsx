/**
 * Outlined tag: a session's purpose, its focus areas, the kit it needs.
 *
 * The accent is passed in rather than chosen here, so one component covers all
 * of them. Omit it for the neutral variant — the plain descriptor ("EASY RIDE")
 * that sits beside a coloured purpose chip and should not compete with it.
 */
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { AccentFillOpacity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChipProps = {
  label: string;
  /** Hex accent from `Accents`. Tints border, fill and text alike. Omit for neutral. */
  accent?: string;
  /** Optional leading SF Symbol — a wrench on equipment, a loop on recovery. */
  icon?: SFSymbol;
};

export function Chip({ label, accent, icon }: ChipProps) {
  const theme = useTheme();

  // Neutral chips take no fill at all: on a card that already has a tinted chip
  // beside them, a second filled box reads as a second emphasis.
  const color = accent ?? theme.textSecondary;
  const borderColor = accent ?? theme.backgroundSelected;
  const backgroundColor = accent ? `${accent}${AccentFillOpacity}` : 'transparent';

  return (
    <View style={[styles.chip, { borderColor, backgroundColor }]}>
      {icon ? <SymbolView name={icon} size={12} tintColor={color} /> : null}
      <ThemedText style={[styles.label, { color }]}>{label.toUpperCase()}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.6,
  },
});
