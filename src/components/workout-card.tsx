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
import { IntervalChart, type IntervalBand, type IntervalSegment } from './interval-chart';
import { MetricGrid, type WorkoutMetric } from './metric-grid';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Accents, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/* Re-exported so the 19 call sites that import it from here keep working; the
   grid itself now lives beside the detail sheet's copy of it. */
export type { WorkoutMetric };

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
  /** Labelled spans over the chart — a swim's warm-up/drill/main structure. */
  bands?: IntervalBand[];
  totalMinutes?: number;
  /** Axis label spacing, in minutes. Longer sessions want a coarser axis. */
  tickEvery?: number;
  coach?: string;
  note?: string;
  onMenuPress?: () => void;
  /** Opens the session's detail sheet. Omit for a card that leads nowhere. */
  onPress?: () => void;
};

export function WorkoutCard({
  title,
  icon,
  iconAccent = Accents.interval,
  status,
  tags = [],
  metrics = [],
  segments = [],
  bands = [],
  totalMinutes = 0,
  tickEvery,
  coach,
  note,
  onMenuPress,
  onPress,
}: WorkoutCardProps) {
  const theme = useTheme();

  const card = (
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

      {metrics.length > 0 ? <MetricGrid metrics={metrics} /> : null}

      {segments.length > 0 ? (
        <IntervalChart
          segments={segments}
          bands={bands}
          totalMinutes={totalMinutes}
          tickEvery={tickEvery}
          style={styles.chart}
        />
      ) : null}

      {coach && note ? <CoachNote coach={coach} note={note} /> : null}
    </ThemedView>
  );

  if (!onPress) {
    return card;
  }

  /*
   * The whole card is the target, not a chevron in the corner: the card *is*
   * the session, and the design gives it no other affordance. The coach note
   * and the overflow button inside keep their own presses — a nested Pressable
   * takes the touch before the one wrapping it does.
   */
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint="Opens the session"
      style={({ pressed }) => pressed && styles.cardPressed}>
      {card}
    </Pressable>
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
  /* Lighter than the overflow button's own feedback: the whole card dimming
     as hard as a single glyph reads as the screen flashing. */
  cardPressed: {
    opacity: 0.8,
  },
  tags: {
    flexDirection: 'row',
    /* Wraps to a second line the way the design does once the kit list grows. */
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chart: {
    marginTop: Spacing.one,
  },
});
