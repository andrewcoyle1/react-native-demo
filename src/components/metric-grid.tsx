/**
 * The two-column grid of figures a session is summarised by.
 *
 * Extracted from `WorkoutCard` so the detail sheet's Completed tab can show the
 * same grid of recorded figures that the Planned tab shows of prescribed ones.
 * They are the same object drawn twice, and were worth one implementation
 * rather than two that drift.
 *
 * Presentation only: every value arrives formatted. Nothing here knows what a
 * pace is.
 */
import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';

export type WorkoutMetric = {
  label: string;
  value: string;
  /** Rendered smaller and beside the value — "min", "/100m". */
  unit?: string;
  /**
   * A second value/unit pair on the same line, for quantities that need two:
   * "1 hr 8 min". Omitted for the ordinary single-unit case.
   */
  extra?: { value: string; unit?: string };
  icon: SFSymbol;
  accent: string;
};

export function MetricGrid({
  metrics,
  style,
}: {
  metrics: WorkoutMetric[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.metrics, style]}>
      {metrics.map(metric => (
        <View key={metric.label} style={styles.metric}>
          <View style={[styles.metricIcon, { borderColor: metric.accent }]}>
            <Icon name={metric.icon} size={20} tintColor={metric.accent} />
          </View>

          <View style={styles.metricText}>
            <ThemedText themeColor="textSecondary" style={styles.metricLabel}>
              {metric.label.toUpperCase()}
            </ThemedText>
            {/* Value and unit share a line via nesting, so the unit stays put
                when the value's width changes. */}
            <ThemedText style={styles.metricValue}>
              {metric.value}
              {metric.unit ? (
                <ThemedText themeColor="textSecondary" style={styles.metricUnit}>
                  {' '}
                  {metric.unit.toUpperCase()}
                </ThemedText>
              ) : null}
              {metric.extra ? ` ${metric.extra.value}` : null}
              {metric.extra?.unit ? (
                <ThemedText themeColor="textSecondary" style={styles.metricUnit}>
                  {' '}
                  {metric.extra.unit.toUpperCase()}
                </ThemedText>
              ) : null}
            </ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.three,
  },
  metric: {
    /* Two per row. A fixed 50% rather than `flex: 1` so a wrapped third tile
       lines up under the first instead of stretching to fill the row. */
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricText: {
    flexShrink: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 600,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: 600,
  },
});
