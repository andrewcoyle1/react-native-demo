/**
 * The shape of a session over time: one bar per effort, drawn against a minute
 * axis.
 *
 * Bars are positioned as a percentage of the session's length rather than laid
 * out in a row, so the gaps between efforts carry the recovery time — a row with
 * `gap` would space them evenly and lose it. Height reads as effort and colour
 * reads as purpose, which is what lets a warm-up block and an interval spike be
 * told apart at a glance.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing, Zones } from '@/constants/theme';

export type IntervalSegment = {
  /** Minutes from the start of the session. */
  startMinute: number;
  durationMinutes: number;
  /** Relative effort, 0-1. Scales the bar's height. */
  intensity: number;
  /** Hex colour from `Zones`. Defaults to the easy aerobic colour. */
  color?: string;
  /** Hatches the bar, marking drill work that is not simply "harder". */
  striped?: boolean;
};

type IntervalChartProps = {
  segments: IntervalSegment[];
  /** Length of the session, which fixes the axis regardless of the last effort. */
  totalMinutes: number;
  /** Tallest possible bar, in points. */
  height?: number;
  /** Spacing of the axis labels, in minutes. */
  tickEvery?: number;
  style?: StyleProp<ViewStyle>;
};

/** Below this a short effort renders as a hairline and disappears. */
const MinBarWidth = 5;
/** Enough lines to cross the widest bar at this angle. */
const HatchCount = 40;
const HatchSpacing = 7;

/**
 * Diagonal hatching, clipped by the bar's own `overflow: 'hidden'`.
 *
 * Drawn as rotated children rather than a repeating gradient: React Native's
 * `experimental_backgroundImage` takes linear gradients only, with no repeating
 * form to make stripes out of.
 */
function Hatching() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: HatchCount }, (_, index) => (
        <View key={index} style={[styles.hatch, { left: index * HatchSpacing }]} />
      ))}
    </View>
  );
}

export function IntervalChart({
  segments,
  totalMinutes,
  height = 64,
  tickEvery = 10,
  style,
}: IntervalChartProps) {
  // Guarded rather than assumed: a zero total would divide every position by 0
  // and place every bar at NaN%.
  const total = Math.max(totalMinutes, 1);

  const ticks: number[] = [];
  for (let minute = 0; minute <= total; minute += tickEvery) {
    ticks.push(minute);
  }

  return (
    <View style={style}>
      <View style={[styles.plot, { height }]}>
        {segments.map((segment, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                left: `${(segment.startMinute / total) * 100}%`,
                width: `${Math.max((segment.durationMinutes / total) * 100, 0)}%`,
                minWidth: MinBarWidth,
                height: Math.max(segment.intensity, 0.08) * height,
                backgroundColor: segment.color ?? Zones.easy,
              },
            ]}>
            {segment.striped ? <Hatching /> : null}
          </View>
        ))}
      </View>

      <View style={styles.axis}>
        {ticks.map(minute => (
          <ThemedText
            key={minute}
            themeColor="textSecondary"
            style={[styles.tick, { left: `${(minute / total) * 100}%` }]}>
            {minute}&apos;
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    /* The positioning context every bar's percentage `left` resolves against. */
    position: 'relative',
    justifyContent: 'flex-end',
  },
  bar: {
    position: 'absolute',
    /* Bars grow upward from the axis, so they are pinned at the foot. */
    bottom: 0,
    borderRadius: 5,
    /* Clips the hatching to the bar's rounded box. */
    overflow: 'hidden',
  },
  hatch: {
    position: 'absolute',
    /* Overshoots vertically so a rotated line still covers a tall bar's corners. */
    top: -60,
    bottom: -60,
    width: 3,
    backgroundColor: 'rgba(255, 214, 102, 0.85)',
    transform: [{ rotate: '20deg' }],
  },
  axis: {
    position: 'relative',
    height: 16,
    marginTop: Spacing.one,
  },
  tick: {
    position: 'absolute',
    fontSize: 11,
    /* Nudges the label left so it centres on its tick rather than starting at
       it. Half a two-character label, near enough at this size. */
    marginLeft: -7,
  },
});
