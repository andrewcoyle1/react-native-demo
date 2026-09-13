/**
 * A labelled figure: an optional symbol above, the label, then the value with
 * its unit and — where the number is a trend rather than a total — the direction
 * it is moving.
 *
 * The direction is a glyph in a tinted disc rather than a coloured number alone,
 * so "up" survives being read by someone who cannot separate the hues.
 */
import { Icon } from './icon';
import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { AccentFillOpacity, Spacing } from '@/constants/theme';

export type Trend = 'up' | 'down' | 'flat';

const TrendSymbols: Record<Trend, SFSymbol> = {
  up: 'arrow.up',
  down: 'arrow.down',
  flat: 'arrow.right',
};

type StatTileProps = {
  label: string;
  value: string;
  unit?: string;
  /** Hex accent for the value and the trend disc. Omit for plain body text. */
  accent?: string;
  /** Symbol above the label. */
  icon?: SFSymbol;
  trend?: Trend;
  /** Centres the block, as the Fitness/Fatigue/Form row does. */
  centred?: boolean;
};

export function StatTile({ label, value, unit, accent, icon, trend, centred }: StatTileProps) {
  return (
    <View style={[styles.tile, centred && styles.centred]}>
      {icon ? <Icon name={icon} size={24} tintColor={accent} /> : null}

      <ThemedText themeColor="textSecondary" style={styles.label}>
        {label.toUpperCase()}
      </ThemedText>

      <View style={styles.valueRow}>
        <ThemedText style={[styles.value, accent ? { color: accent } : null]}>
          {value}
          {unit ? (
            <ThemedText themeColor="textSecondary" style={styles.unit}>
              {' '}
              {unit.toUpperCase()}
            </ThemedText>
          ) : null}
        </ThemedText>

        {trend ? (
          <View
            style={[
              styles.trend,
              { backgroundColor: `${accent ?? '#888888'}${AccentFillOpacity}` },
            ]}>
            <Icon name={TrendSymbols[trend]} size={12} tintColor={accent} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    gap: Spacing.one,
  },
  centred: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.6,
  },
  valueRow: {
    flexDirection: 'row',
    /* 'baseline' would drop the trend disc below the digits; centring keeps it
       on the number's optical middle. */
    alignItems: 'center',
    gap: Spacing.two,
  },
  value: {
    fontSize: 30,
    /* Set explicitly: ThemedText's default preset carries a 24pt line height,
       which clips the tops of digits this size. */
    lineHeight: 36,
    fontWeight: 400,
  },
  unit: {
    fontSize: 13,
    fontWeight: 500,
  },
  trend: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
