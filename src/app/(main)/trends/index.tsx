import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { SectionCard } from '@/components/section-card';
import { StatTile } from '@/components/stat-tile';
import { Accents, ActivePlanAccent, Spacing, Zones } from '@/constants/theme';
import { formatDistance, formatDurationParts } from '@/domain/format';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTrends, type TrendsModel, type Volume } from '@/providers/trends-provider';

/** Zeroes while the figures load, so the layout never jumps. */
const EMPTY: TrendsModel = {
  planned: { durationSeconds: 0, distanceMetres: 0 },
  completed: { durationSeconds: 0, distanceMetres: 0 },
  fitness: { value: 0, direction: 'flat', change: 0 },
  fatigue: { value: 0, direction: 'flat', change: 0 },
  form: { value: 0, direction: 'flat', change: 0 },
};

/** A volume as the two figures the card shows side by side. */
function toFigures(volume: Volume) {
  const time = formatDurationParts(volume.durationSeconds);
  const distance = formatDistance(volume.distanceMetres, 'metric');

  return {
    time: {
      value: time.value,
      unit: time.unit,
      extra: time.extra?.value,
      extraUnit: time.extra?.unit,
    },
    distance: { value: distance.value, unit: distance.unit },
  };
}

/**
 * Form is read the opposite way round from the other two.
 *
 * Rising fatigue is a warning and rising fitness is good news, but rising form
 * means fresh — so the accent follows the meaning rather than the arrow.
 */
function formAccent(value: number): string {
  return value >= 0 ? ActivePlanAccent : Accents.recovery;
}

export default function TrendsScreen() {
  useScreenTracking('Trends');

  const { state } = useTrends();
  const trends = state.status === 'ready' ? state.data : EMPTY;

  const planned = toFigures(trends.planned);
  const completed = toFigures(trends.completed);

  return (
    <Screen>
      {state.status === 'error' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {state.message}
        </ThemedText>
      ) : null}

      <SectionCard title="Training Goals" icon="chart.line.uptrend.xyaxis" iconAccent={ActivePlanAccent}>
        {/* Planned and completed sit side by side so the shortfall is read as a
            comparison rather than as two separate figures. */}
        <View style={styles.columns}>
          <View style={styles.column}>
            <GoalFigures label="Planned" time={planned.time} distance={planned.distance} />
          </View>
          <View style={styles.column}>
            <GoalFigures
              label="Completed"
              time={completed.time}
              distance={completed.distance}
              accent={ActivePlanAccent}
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title="Fitness, Fatigue & Form"
        icon="heart.text.square"
        iconAccent={ActivePlanAccent}
        /* Fresh when form is positive: fitness carried without the fatigue. */
        badge={trends.form.value >= 0 ? 'Fresh' : 'Loaded'}
        badgeAccent={formAccent(trends.form.value)}>
        <View style={styles.columns}>
          <View style={styles.column}>
            <StatTile
              centred
              icon="battery.25"
              label="Fatigue"
              value={`${trends.fatigue.value}`}
              accent={Accents.speed}
              trend={trends.fatigue.direction}
            />
          </View>
          <View style={styles.column}>
            <StatTile
              centred
              icon="heart"
              label="Fitness"
              value={`${trends.fitness.value}`}
              accent={ActivePlanAccent}
              trend={trends.fitness.direction}
            />
          </View>
          <View style={styles.column}>
            <StatTile
              centred
              icon="paperplane"
              label="Form"
              value={`${trends.form.value}`}
              accent={formAccent(trends.form.value)}
              trend={trends.form.direction}
            />
          </View>
        </View>
      </SectionCard>

      {/* Still hardcoded: VO2 max and threshold pace are athlete attributes
          rather than aggregates, so they belong on the profile alongside heart
          rate range — not in this endpoint. */}
      <SectionCard title="Run Threshold & VO2 Max" icon="figure.run" iconAccent={Zones.hard}>
        <View style={styles.columns}>
          <View style={styles.column}>
            <StatTile
              centred
              icon="speedometer"
              label="VO2Max"
              value="53.4"
              accent={Accents.schedule}
              trend="flat"
            />
          </View>
          <View style={styles.column}>
            <StatTile
              centred
              icon="gauge.with.dots.needle.bottom.50percent"
              label="Threshold pace"
              value="4:31"
              unit="/km"
              accent={Zones.hard}
              trend="up"
            />
          </View>
        </View>
      </SectionCard>
    </Screen>
  );
}

type Figure = { value: string; unit: string; extra?: string; extraUnit?: string };

/**
 * A goal's two lines — time then distance — sharing one label.
 *
 * Written out rather than reusing `StatTile` because the pair share a heading
 * and the time carries two units, which the tile's single value/unit cannot
 * hold. Units are nested inside the figure so they stay on its baseline.
 */
function GoalFigures({
  label,
  time,
  distance,
  accent,
}: {
  label: string;
  time: Figure;
  distance: Figure;
  accent?: string;
}) {
  const figureStyle = [styles.figure, accent ? { color: accent } : styles.figureMuted];

  return (
    <View style={styles.goal}>
      <ThemedText themeColor="textSecondary" style={styles.goalLabel}>
        {label.toUpperCase()}
      </ThemedText>

      <ThemedText style={figureStyle}>
        {time.value}
        <ThemedText themeColor="textSecondary" style={styles.unit}>
          {' '}
          {time.unit.toUpperCase()}
        </ThemedText>
        {time.extra ? ` ${time.extra}` : null}
        {time.extraUnit ? (
          <ThemedText themeColor="textSecondary" style={styles.unit}>
            {' '}
            {time.extraUnit.toUpperCase()}
          </ThemedText>
        ) : null}
      </ThemedText>

      <ThemedText style={figureStyle}>
        {distance.value}
        <ThemedText themeColor="textSecondary" style={styles.unit}>
          {' '}
          {distance.unit.toUpperCase()}
        </ThemedText>
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: {
    flexDirection: 'row',
  },
  column: {
    /* Equal halves, so the two goals line up figure for figure. */
    flex: 1,
  },
  goal: {
    gap: Spacing.one,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.6,
    marginBottom: Spacing.one,
  },
  unit: {
    fontSize: 13,
    fontWeight: 500,
  },
  figure: {
    fontSize: 30,
    /* As above: the default 24pt line height would clip these digits. */
    lineHeight: 36,
    fontWeight: 400,
  },
  figureMuted: {
    opacity: 0.55,
  },
});
