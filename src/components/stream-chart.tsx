/**
 * A recorded stream over distance — pace, heart rate or cadence.
 *
 * Drawn with SVG rather than the stacked views the interval chart uses. That
 * chart plots a few dozen rectangles; this one plots several hundred samples as
 * a continuous line, and a view per sample would be both slower and unable to
 * join them.
 *
 * Presentation only. The caller supplies values already in the orientation it
 * wants — see `invert` — plus the axis labels as strings, because what "5:04"
 * means is the presenter's business and not this component's.
 */
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StreamPoint = {
  /** Position along the route, in metres. The x axis. */
  atMetres: number;
  value: number;
};

type StreamChartProps = {
  points: StreamPoint[];
  /** Hex accent for the line and its wash. */
  color: string;
  /**
   * Y-axis labels, top row first. The caller has already decided the scale, so
   * these are laid out evenly down the plot and are never derived here.
   */
  yLabels: string[];
  /** X-axis labels, left to right — '1km', '2km'. */
  xLabels: string[];
  /** Smallest and largest value the axis spans. */
  min: number;
  max: number;
  /** The mean, drawn as a dashed rule. Omit to draw none. */
  average?: number;
  /**
   * Whether a larger value sits lower on the plot. True for pace, where a
   * smaller number is a faster runner and belongs at the top.
   */
  invert?: boolean;
  height?: number;
};

/** Enough resolution to read, without emitting a path the size of the screen. */
const MaxPoints = 180;

/** Downsamples by taking every nth point — the shape survives, the size does not. */
function thin(points: StreamPoint[]): StreamPoint[] {
  if (points.length <= MaxPoints) {
    return points;
  }
  const stride = Math.ceil(points.length / MaxPoints);
  return points.filter((_, index) => index % stride === 0);
}

export function StreamChart({
  points,
  color,
  yLabels,
  xLabels,
  min,
  max,
  average,
  invert = false,
  height = 120,
}: StreamChartProps) {
  const theme = useTheme();
  // Measured rather than assumed: the SVG needs real pixels for its viewBox,
  // and the card it sits in is as wide as whatever the sheet gives it.
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const sampled = thin(points);
  // Guarded: a flat stream would otherwise divide every y by zero.
  const span = Math.max(max - min, 0.0001);
  const lastMetres = Math.max(sampled.at(-1)?.atMetres ?? 1, 1);

  /** A value's distance down the plot, 0 at the top. */
  const toY = (value: number) => {
    const fraction = (value - min) / span;
    return (invert ? fraction : 1 - fraction) * height;
  };

  const toX = (atMetres: number) => (atMetres / lastMetres) * width;

  const line = sampled
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${toX(point.atMetres)},${toY(point.value)}`)
    .join(' ');

  // The wash is the same path closed down to the baseline, so the fill can never
  // disagree with the line above it.
  const area = sampled.length > 0 ? `${line} L${width},${height} L0,${height} Z` : '';
  const gradientId = `stream-${color.replace('#', '')}`;

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.yAxis}>
          {yLabels.map(label => (
            <ThemedText key={label} themeColor="textSecondary" style={styles.axisLabel}>
              {label}
            </ThemedText>
          ))}
        </View>

        <View style={styles.plot} onLayout={onLayout}>
          {/* Gridlines are views behind the SVG rather than lines inside it:
              they belong to the axis, and drawing them here keeps them aligned
              with the labels beside them without a second scale. */}
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

          {width > 0 && sampled.length > 1 ? (
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={color} stopOpacity={0.02} />
                </LinearGradient>
              </Defs>

              <Path d={area} fill={`url(#${gradientId})`} />
              <Path
                d={line}
                stroke={color}
                strokeWidth={1.5}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {average !== undefined ? (
                <Path
                  d={`M0,${toY(average)} L${width},${toY(average)}`}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.7}
                />
              ) : null}
            </Svg>
          ) : (
            <View style={{ height }} />
          )}
        </View>
      </View>

      <View style={styles.xAxis}>
        {xLabels.map(label => (
          <ThemedText key={label} themeColor="textSecondary" style={styles.axisLabel}>
            {label}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  yAxis: {
    /* Fixed, so two charts stacked in a column share a left edge even when one
       is labelled "3:00" and the other "160". */
    width: 34,
    justifyContent: 'space-between',
    /* Pulls the first and last labels onto their own gridlines rather than
       leaving them centred in the space between. */
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
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.one,
    marginLeft: 34,
  },
  axisLabel: {
    fontSize: 10,
  },
});
