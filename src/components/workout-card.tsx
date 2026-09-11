/**
 * A single planned session: what it is, what it needs, what it costs you, how it
 * is shaped over time, and what the coach said about it.
 *
 * Presentation only — every value is passed in. Each block guards itself, so the
 * same component covers a full interval session and a bare commitment with
 * nothing but a title and one chip.
 */
import { Icon } from './icon';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip, type ChipProps } from './chip';
import { CoachNote } from './coach-note';
import { IntervalChart, type IntervalSegment } from './interval-chart';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Accents, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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

type WorkoutCardProps = {
  title: string;
  /** Discipline symbol beside the title. */
  icon: SFSymbol;
  /** Hex accent for the discipline symbol — one colour per sport. */
  iconAccent?: string;
  /** Shown as a green capsule after the title. Omit while a session is pending. */
  status?: string;
  /** Purpose, focus and equipment, in the order they should read. */
  tags?: ChipProps[];
  metrics?: WorkoutMetric[];
  segments?: IntervalSegment[];
  totalMinutes?: number;
  /** Axis label spacing, in minutes. Longer sessions want a coarser axis. */
  tickEvery?: number;
  coach?: string;
  note?: string;
  onMenuPress?: () => void;
};

export function WorkoutCard({
  title,
  icon,
  iconAccent = Accents.interval,
  status,
  tags = [],
  metrics = [],
  segments = [],
  totalMinutes = 0,
  tickEvery,
  coach,
  note,
  onMenuPress,
}: WorkoutCardProps) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.backgroundSelected }]}>
      <View style={styles.header}>
        {/* The symbol sits inside the text flow so it stays on the title's first
            line as the title wraps, rather than centring against the whole block. */}
        <Icon name={icon} size={26} tintColor={iconAccent} style={styles.disciplineIcon} />

        <View style={styles.titleBlock}>
          <ThemedText style={styles.title}>
            {title}
            {status ? '  ' : null}
            {status ? (
              <ThemedText style={[styles.status, { color: Accents.success }]}>
                {status.toUpperCase()}
              </ThemedText>
            ) : null}
          </ThemedText>
        </View>

        {onMenuPress ? (
          <Pressable
            onPress={onMenuPress}
            accessibilityRole="button"
            accessibilityLabel={`Options for ${title}`}
            /* Enlarges the touch target without enlarging the glyph, which at
               this size would otherwise be well under the 44pt minimum. */
            hitSlop={Spacing.two}
            style={({ pressed }) => pressed && styles.pressed}>
            <Icon name="ellipsis" size={18} tintColor={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {tags.length > 0 ? (
        <View style={styles.tags}>
          {tags.map(tag => (
            <Chip key={tag.label} {...tag} />
          ))}
        </View>
      ) : null}

      {metrics.length > 0 ? (
        <View style={styles.metrics}>
          {metrics.map(metric => (
            <View key={metric.label} style={styles.metric}>
              <View style={[styles.metricIcon, { borderColor: metric.accent }]}>
                <Icon name={metric.icon} size={20} tintColor={metric.accent} />
              </View>

              <View style={styles.metricText}>
                <ThemedText themeColor="textSecondary" style={styles.metricLabel}>
                  {metric.label.toUpperCase()}
                </ThemedText>
                {/* Value and unit share a line via nesting, so the unit stays
                    put when the value's width changes. */}
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
      ) : null}

      {segments.length > 0 ? (
        <IntervalChart
          segments={segments}
          totalMinutes={totalMinutes}
          tickEvery={tickEvery}
          style={styles.chart}
        />
      ) : null}

      {coach && note ? <CoachNote coach={coach} note={note} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  disciplineIcon: {
    /* Nudges the glyph onto the title's optical baseline; icon boxes sit a
       little high against text of this size. */
    marginTop: 2,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 600,
    lineHeight: 28,
  },
  status: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  pressed: {
    opacity: 0.5,
  },
  tags: {
    flexDirection: 'row',
    /* Wraps to a second line the way the design does once the kit list grows. */
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
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
  chart: {
    marginTop: Spacing.one,
  },
});
