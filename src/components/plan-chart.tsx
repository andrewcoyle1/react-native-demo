import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';

import { ActivePlanAccent, Spacing } from '@/constants/theme';

/**
 * Colours are fixed rather than theme tokens: this chart is designed to sit on
 * a photograph, which does not change with the light/dark theme.
 */
const BarColors = {
  done: ActivePlanAccent,
  /** Weeks not yet started — a wash over the artwork rather than a solid fill. */
  todo: 'rgba(255, 255, 255, 0.28)',
  /** The dashed outline showing the current week's target. */
  target: 'rgba(255, 255, 255, 0.85)',
} as const;

/** Reserved above the bars so the label has somewhere to go. */
const LabelHeight = 28;
/** Shared by the layout and the maths that positions the label. */
const BarGap = Spacing.half;

type PlanChartProps = {
  /** One value per week, in whatever unit the plan uses (hours here). */
  bars: number[];
  /**
   * The week in progress. Bars before it read as completed, the bar itself is
   * drawn as a dashed target with the achieved portion filled, and bars after
   * it are upcoming. Omit for a chart with no "today".
   */
  currentIndex?: number;
  /**
   * How much of the current week is done, 0-1. Only used for `currentIndex`.
   */
  currentProgress?: number;
  /** Suffix on the current bar's label — the unit its values are in. */
  unit?: string;
  /** Tallest bar's height in points, excluding the label above it. */
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function PlanChart({
  bars,
  currentIndex,
  currentProgress = 0,
  unit = 'h',
  height = 90,
  style,
}: PlanChartProps) {
  // Both are measured rather than assumed: the label is centred over its bar,
  // which needs the real widths of the chart and of the label itself.
  const [chartWidth, setChartWidth] = useState(0);
  const [labelWidth, setLabelWidth] = useState(0);

  // Scale against the largest value so the tallest bar always fills `height`.
  // Guarded against an all-zero series, which would divide by zero.
  const max = Math.max(...bars, 1);

  function barHeightAt(index: number) {
    // A floor keeps a zero-value week visible as a stub rather than vanishing,
    // so the week count stays readable.
    return Math.max((bars[index] / max) * height, Spacing.one);
  }

  function handleChartLayout(event: LayoutChangeEvent) {
    setChartWidth(event.nativeEvent.layout.width);
  }

  function handleLabelLayout(event: LayoutChangeEvent) {
    setLabelWidth(event.nativeEvent.layout.width);
  }

  // The label reads off the data, so it cannot drift out of step with the bar
  // it sits above.
  const showLabel = currentIndex !== undefined && chartWidth > 0 && bars[currentIndex] !== undefined;

  let labelLeft = 0;
  let labelBottom = 0;
  if (currentIndex !== undefined) {
    const barWidth = (chartWidth - BarGap * (bars.length - 1)) / bars.length;
    const barCentre = currentIndex * (barWidth + BarGap) + barWidth / 2;
    // Clamped so a label over the first or last bar stays inside the chart
    // instead of hanging off the edge.
    labelLeft = Math.min(Math.max(barCentre - labelWidth / 2, 0), chartWidth - labelWidth);
    labelBottom = barHeightAt(currentIndex) + Spacing.one;
  }

  return (
    <View style={[styles.container, { height: height + LabelHeight }, style]} accessible={false}>
      <View style={styles.chart} onLayout={handleChartLayout}>
        {bars.map((value, index) => {
          const barHeight = barHeightAt(index);

          if (index === currentIndex) {
            return (
              <View key={index} style={[styles.bar, styles.target, { height: barHeight }]}>
                {/* Fill grows from the bottom, anchored by the parent's
                    `justifyContent: 'flex-end'`. */}
                <View
                  style={[
                    styles.currentFill,
                    { height: Math.max(barHeight * currentProgress, Spacing.one) },
                  ]}
                />
              </View>
            );
          }

          const done = currentIndex !== undefined && index < currentIndex;

          return (
            <View
              key={index}
              style={[
                styles.bar,
                { height: barHeight, backgroundColor: done ? BarColors.done : BarColors.todo },
              ]}
            />
          );
        })}
      </View>

      {showLabel ? (
        <View
          onLayout={handleLabelLayout}
          style={[styles.pill, { left: labelLeft, bottom: labelBottom }]}>
          <ThemedText style={styles.pillText}>{`${bars[currentIndex]}${unit}`}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    /* Bars sit at the foot; the label floats above them. */
    justifyContent: 'flex-end',
  },
  chart: {
    flexDirection: 'row',
    /* Bars grow upward from a shared baseline. */
    alignItems: 'flex-end',
    gap: BarGap,
  },
  bar: {
    /* Every bar takes an equal share of the width, so the chart fits any number
       of weeks without the caller doing arithmetic. */
    flex: 1,
    borderRadius: Spacing.one,
  },
  target: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BarColors.target,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  currentFill: {
    backgroundColor: BarColors.done,
    borderRadius: Spacing.one,
  },
  pill: {
    position: 'absolute',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BarColors.done,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  pillText: {
    color: BarColors.done,
    fontSize: 13,
    fontWeight: 700,
  },
});
