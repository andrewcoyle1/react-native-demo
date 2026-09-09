/**
 * Card with a symbol-and-title header, and an optional status pill opposite.
 *
 * The Trends and Plan screens are built from these: the header names the group
 * and the pill, when present, is the one-word verdict on it.
 */
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { AccentFillOpacity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SectionCardProps = {
  title: string;
  icon: SFSymbol;
  /** Hex accent for the header symbol. */
  iconAccent: string;
  /** Short verdict shown as a pill on the trailing edge — "Optimal". */
  badge?: string;
  /** Hex accent for the badge. Defaults to the header symbol's. */
  badgeAccent?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SectionCard({
  title,
  icon,
  iconAccent,
  badge,
  badgeAccent,
  children,
  style,
}: SectionCardProps) {
  const theme = useTheme();
  const accent = badgeAccent ?? iconAccent;

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.backgroundSelected }, style]}>
      <View style={styles.header}>
        <SymbolView name={icon} size={20} tintColor={iconAccent} />
        <ThemedText style={styles.title}>{title}</ThemedText>

        {badge ? (
          <View
            style={[styles.badge, { backgroundColor: `${accent}${AccentFillOpacity}` }]}>
            <View style={[styles.badgeDot, { backgroundColor: accent }]} />
            <ThemedText style={[styles.badgeText, { color: accent }]}>
              {badge.toUpperCase()}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.four,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    /* Takes the slack so the badge is pushed to the trailing edge. */
    flex: 1,
    fontSize: 17,
    fontWeight: 600,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 1,
    borderRadius: 999,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.6,
  },
});
