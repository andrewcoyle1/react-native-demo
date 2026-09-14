/**
 * Lap paces as bars, tallest-is-fastest.
 *
 * The inversion is the thing to hold on to: a lap's *pace* is a smaller number
 * when the athlete ran faster, so plotting the number directly would draw the
 * strides as the shortest bars in the chart. The bar's height is therefore how
 * far the lap sits above the slowest one, which puts the fast laps where the
 * eye expects them.
 *
 * Views rather than SVG: there are fifteen bars, not five hundred samples, and
 * this way each one keeps its own rounded corners and press target.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LapBar = {
  id: string;
  /** Seconds per kilometre. Smaller is faster. */
  paceSecondsPerKm: number;
  /** How much of the row this lap covers, 0-1 — a 115m stride is a thin bar. */
  widthFraction: number;
};

type LapsChartProps = {
  bars: LapBar[];
  /** Y-axis labels, fastest first — the chart reads downward into slower paces. */
  yLabels: string[];
  /** The unit under the axis — '/km'. */
  unitLabel: string;
  color: string;
  height?: number;
};

/** A bar this short still reads as a lap rather than as an empty column. */
const MinHeightFraction = 0.06;

export function LapsChart({ bars, yLabels, unitLabel, color, height = 150 }: LapsChartProps) {
  const theme = useTheme();

  const paces = bars.map(bar => bar.paceSecondsPerKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  // Guarded: a set of identical laps would divide every height by zero.
  const span = Math.max(slowest - fastest, 1);

  return (
    <View>
      <View style={styles.row}>
        <View style={[styles.yAxis, { height }]}>
          {yLabels.map(label => (
            <ThemedText key={label} themeColor="textSecondary" style={styles.axisLabel}>
              {label}
            </ThemedText>
          ))}
        </View>

        <View style={[styles.plot, { height }]}>
          {yLabels.map((label, index) => (
            <View
              key={label}
              style={[
                styles.gridline,
                {
                  top: (index / Math.max(yLabels.length - 1, 1)) * height,
                  backgroundColor: theme.backgroundSelected,
                },
              ]}
            />
          ))}

          <View style={styles.bars}>
            {bars.map(bar => (
              <View
                key={bar.id}
                style={[
                  styles.bar,
                  {
                    /* Proportional to the lap's length, so a short stride lap
                       is visibly a short lap and not an equal column. */
                    flexGrow: bar.widthFraction,
                    height:
                      (MinHeightFraction +
                        (1 - MinHeightFraction) * ((slowest - bar.paceSecondsPerKm) / span)) *
                      height,
                    backgroundColor: color,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      <ThemedText themeColor="textSecondary" style={[styles.axisLabel, styles.unit]}>
        {unitLabel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  yAxis: {
    width: 34,
    justifyContent: 'space-between',
    marginVertical: -6,
  },
  plot: {
    flex: 1,
    position: 'relative',
  },
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  bars: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    /* Bars grow upward from the axis. */
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    /* Without a basis, flexGrow alone leaves every bar at its content width of
       zero and the row collapses. */
    flexBasis: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    opacity: 0.85,
  },
  axisLabel: {
    fontSize: 10,
  },
  unit: {
    marginLeft: 8,
    marginTop: Spacing.half,
  },
});
