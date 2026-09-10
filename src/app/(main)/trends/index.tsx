import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { SectionCard } from '@/components/section-card';
import { StatTile } from '@/components/stat-tile';
import { Accents, ActivePlanAccent, Spacing, Zones } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';

/**
 * Placeholder figures until the metrics service lands, in the same arrangement
 * as `sample-week`: the screen is about layout, the numbers arrive later.
 */
const GOALS = {
  plannedTime: { value: '8', unit: 'hr', extra: '6', extraUnit: 'min' },
  plannedDistance: { value: '110.9', unit: 'km' },
  completedTime: { value: '4', unit: 'hr', extra: '28', extraUnit: 'min' },
  completedDistance: { value: '52.1', unit: 'km' },
};

export default function TrendsScreen() {
  useScreenTracking('Trends');

  return (
    <Screen>

      <SectionCard title="Training Goals" icon="chart.line.uptrend.xyaxis" iconAccent={ActivePlanAccent}>
        {/* Planned and completed sit side by side so the shortfall is read as a
            comparison rather than as two separate figures. */}
        <View style={styles.columns}>
          <View style={styles.column}>
            <GoalFigures
              label="Planned"
              time={GOALS.plannedTime}
              distance={GOALS.plannedDistance}
            />
          </View>
          <View style={styles.column}>
            <GoalFigures
              label="Completed"
              time={GOALS.completedTime}
              distance={GOALS.completedDistance}
              accent={ActivePlanAccent}
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title="Fitness, Fatigue & Form"
        icon="heart.text.square"
        iconAccent={ActivePlanAccent}
        badge="Optimal"
        badgeAccent={ActivePlanAccent}>
        <View style={styles.columns}>
          <View style={styles.column}>
            <StatTile
              centred
              icon="battery.25"
              label="Fatigue"
              value="68"
              accent={Accents.speed}
              trend="up"
            />
          </View>
          <View style={styles.column}>
            <StatTile
              centred
              icon="heart"
              label="Fitness"
              value="38"
              accent={ActivePlanAccent}
              trend="up"
            />
          </View>
          <View style={styles.column}>
            <StatTile
              centred
              icon="paperplane"
              label="Form"
              value="-30"
              accent={Accents.recovery}
              trend="down"
            />
          </View>
        </View>
      </SectionCard>

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
