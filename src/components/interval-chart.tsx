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

/**
 * A labelled span across the top of the chart — the WU / DRL / MAIN / SKL / SPD
 * / WD structure a swim session is read in.
 *
 * Drawn as a header strip with a dashed rule down each boundary, so the bars
 * below can be attributed to a part of the workout without reading the step
 * list. Empty for the many sessions that are one continuous effort.
 */
export type IntervalBand = {
  label: string;
  startMinute: number;
  durationMinutes: number;
  /** Tints the label and the band's ground. */
  color: string;
};

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
  /** Labelled spans over the plot. Omit for a session read as one block. */
  bands?: IntervalBand[];
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
  bands = [],
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
      {bands.length > 0 ? (
        <View style={styles.bands}>
          {bands.map(band => (
            <View
              key={`${band.label}-${band.startMinute}`}
              style={[
                styles.band,
                {
                  left: `${(band.startMinute / total) * 100}%`,
                  width: `${(band.durationMinutes / total) * 100}%`,
                  borderColor: band.color,
                },
              ]}>
              {/* Truncated rather than wrapped: a narrow band is still worth a
                  ground and a rule even when its name will not fit. */}
              <ThemedText numberOfLines={1} style={[styles.bandLabel, { color: band.color }]}>
                {band.label.toUpperCase()}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.plot, { height }]}>
        {/* The band boundaries continue down through the bars, which is what
            makes a bar legible as belonging to the set above it. Drawn first so
            the bars sit over them. */}
        {bands.map(band => (
          <View
            key={`rule-${band.label}-${band.startMinute}`}
            pointerEvents="none"
            style={[
              styles.bandRule,
              {
                left: `${(band.startMinute / total) * 100}%`,
                borderColor: band.color,
              },
            ]}
          />
        ))}

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
  bands: {
    position: 'relative',
    height: 16,
    marginBottom: Spacing.one,
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    /* A rule on the leading edge only, so adjacent bands share one line
       between them rather than drawing two against each other. */
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    paddingLeft: 3,
    justifyContent: 'center',
  },
  bandLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  bandRule: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    /* Well back: this is a registration mark for the bars, not a gridline
       competing with them. */
    opacity: 0.3,
  },
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
