/**
 * One session, in full: what was asked for, and what was done.
 *
 * Two tabs over one scroll view, switched by a control pinned at the foot of
 * the sheet. The split is the design's and it is the right one — a planned
 * session and a recorded activity are different objects that happen to share a
 * title, and forcing them into one column would leave the athlete scrolling
 * past the plan to reach their own run.
 *
 * All presentation. Every value comes from `use-session-detail.ts` and the two
 * detail presenters; nothing is computed here.
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AltSessionDetailScreen } from '@/components/alt/session-detail-screen';
import { Chip } from '@/components/chip';
import { CoachNote } from '@/components/coach-note';
import { ConnectionRow } from '@/components/connection-row';
import { Icon } from '@/components/icon';
import { IntervalChart } from '@/components/interval-chart';
import { LapsChart } from '@/components/laps-chart';
import { MetricGrid } from '@/components/metric-grid';
import { RouteLine } from '@/components/route-line';
import { SectionCard } from '@/components/section-card';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { StreamChart } from '@/components/stream-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkoutSteps } from '@/components/workout-steps';
import { Disciplines } from '@/constants/disciplines';
import { Accents, Spacing } from '@/constants/theme';
import type { UnitSystem } from '@/domain/training';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useSessionDetail, type SessionDetailTab } from '@/hooks/use-session-detail';
import { useTheme } from '@/hooks/use-theme';
import { useDevicePreferences } from '@/providers/device-preferences';
import {
  toActivityMetrics,
  toLapAxis,
  toLapBars,
  toReviewLabel,
  toStreamCharts,
} from '@/presenters/activity-detail-presenter';
import {
  toChartBands,
  toConnectionRows,
  toDetailMetrics,
  toEstimateFootnote,
  toSessionDateLine,
  toWorkoutSets,
} from '@/presenters/session-detail-presenter';
import { toSessionSegments, toSessionTags } from '@/presenters/session-presenter';
import type { ActivityModel } from '@/providers/activities-provider';
import type { SessionModel } from '@/providers/sessions-provider';

/** Liquid glass is iOS 26+; elsewhere the floating controls need a fill. */
const glassAvailable = isLiquidGlassAvailable();

/** Height of the pinned tab bar, and the page gutter inside the sheet. */
const TabBarHeight = 48;
const Gutter = 20;

export default function SessionDetailSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useScreenTracking('Session detail');

  const theme = useTheme();
  const detail = useSessionDetail(id);
  const { alternateUi, ready: preferencesReady } = useDevicePreferences();
  const { state } = detail;

  /* Held rather than rendered-then-swapped: reading the choice takes a moment,
     and showing one build for a frame before replacing it with the other reads
     as a glitch. The other tabs make the same call at the same point. */
  if (state.status === 'loading' || !preferencesReady) {
    /* Deliberately blank rather than a spinner: the sheet animates in over the
       screen behind it, and a spinner that appears for a moment during that
       animation reads as a stutter. */
    return <View style={[styles.fill, { backgroundColor: theme.background }]} />;
  }

  if (state.status !== 'ready') {
    return (
      <View style={[styles.fill, styles.centred, { backgroundColor: theme.background }]}>
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          {state.status === 'missing'
            ? 'This session is no longer in your plan.'
            : 'Could not load this session.'}
        </ThemedText>
      </View>
    );
  }

  if (alternateUi) {
    return (
      <AltSessionDetailScreen
        model={toAltModel(detail, state.session, state.activity)}
      />
    );
  }

  return <SessionDetailView detail={detail} session={state.session} activity={state.activity} />;
}

/**
 * The alternate build's view model.
 *
 * Built here rather than inside the component for the reason every other alt
 * screen is: the route owns the data, and the gluestack build is presentational
 * all the way down. It reads the same presenters as the standard build, so the
 * two can differ in how a session looks and never in what it says.
 */
function toAltModel(
  detail: ReturnType<typeof useSessionDetail>,
  session: SessionModel,
  activity: ActivityModel | null,
) {
  const { units } = detail;
  const discipline = Disciplines[session.discipline];
  const charts = activity ? toStreamCharts(activity, units, activity.discipline) : [];

  return {
    dateLine: toSessionDateLine(session.date),
    title: session.title,
    icon: discipline.icon,
    iconAccent: discipline.accent,
    completed: session.completion !== null,
    tab: detail.tab,
    onTab: detail.setTab,
    hasCompleted: detail.hasCompleted,
    onClose: () => router.back(),

    planned: {
      /* Labels only: the alternate build draws these as neutral badges, so the
         accent each chip carries here would be read and thrown away. */
      tags: toSessionTags(session).map(tag => tag.label),
      metrics: toDetailMetrics(session, units).map(({ label, value, unit }) => ({
        label,
        value,
        unit,
      })),
      footnote: toEstimateFootnote(session),
      segments: toSessionSegments(session),
      bands: toChartBands(session),
      totalMinutes: session.chartSeconds !== null ? session.chartSeconds / 60 : 0,
      tickEvery: session.tickEveryMinutes ?? undefined,
      coach:
        session.coachName && session.coachNote
          ? { name: session.coachName, note: session.coachNote }
          : null,
      sets: toWorkoutSets(session, units),
      connections: toConnectionRows(session.connections).map(({ title, subtitle, accent }) => ({
        title,
        subtitle,
        accent,
      })),
    },

    recorded: activity
      ? {
          title: activity.title,
          route: activity.route,
          metrics: toActivityMetrics(activity, units).map(({ label, value, unit }) => ({
            label,
            value,
            unit,
          })),
          rpe: activity.review?.rpe ?? null,
          laps: toLapBars(activity.laps),
          lapAxis: activity.laps.length > 1 ? toLapAxis(activity.laps) : [],
          lapUnit: units === 'imperial' ? '/mi' : '/km',
          lapCount: activity.laps.length,
          charts,
          onUncomplete: () => void detail.uncomplete(),
          busy: detail.busy,
        }
      : null,
  };
}

function SessionDetailView({
  detail,
  session,
  activity,
}: {
  detail: ReturnType<typeof useSessionDetail>;
  session: SessionModel;
  activity: ActivityModel | null;
}) {
  const theme = useTheme();
  const { units, tab, setTab, hasCompleted } = detail;

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SessionHeader session={session} />

        {tab === 'planned' ? (
          <PlannedTab session={session} units={units} />
        ) : activity ? (
          <CompletedTab
            session={session}
            activity={activity}
            units={units}
            onUncomplete={detail.uncomplete}
            busy={detail.busy}
          />
        ) : null}
      </ScrollView>

      {/* Floating, with the content running underneath — the design keeps the
          switch reachable from anywhere in either tab. */}
      <View style={styles.tabBar} pointerEvents="box-none">
        <SegmentedTabs<SessionDetailTab>
          tabs={[
            { value: 'planned', label: 'Planned' },
            /* Disabled rather than hidden when there is nothing recorded: the
               athlete should be able to see that the other half exists. */
            { value: 'completed', label: 'Completed', disabled: !hasCompleted },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <View style={styles.close} pointerEvents="box-none">
        <GlassView
          glassEffectStyle="regular"
          style={[styles.fab, !glassAvailable && { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={`Close ${session.title}`}
            style={({ pressed }) => [styles.fabInner, pressed && styles.pressed]}>
            <Icon name="xmark" size={16} tintColor={theme.icon} />
          </Pressable>
        </GlassView>
      </View>
    </View>
  );
}

/** Date line, discipline symbol, title and status — shared by both tabs. */
function SessionHeader({ session }: { session: SessionModel }) {
  const theme = useTheme();
  const discipline = Disciplines[session.discipline];

  return (
    <View style={styles.header}>
      <ThemedText themeColor="textSecondary" style={styles.dateLine}>
        {toSessionDateLine(session.date)}
      </ThemedText>

      <View style={styles.titleRow}>
        <Icon
          name={discipline.icon}
          size={24}
          tintColor={discipline.accent}
          style={styles.disciplineIcon}
        />

        {/* Status nested in the title's own text flow, so it follows the last
            word rather than sitting on a line of its own. */}
        <ThemedText style={styles.title}>
          {session.title}
          {session.completion ? '  ' : null}
          {session.completion ? (
            <ThemedText style={[styles.status, { color: Accents.success }]}>COMPLETED</ThemedText>
          ) : null}
        </ThemedText>
      </View>

      <View style={[styles.rule, { backgroundColor: theme.backgroundSelected }]} />
    </View>
  );
}

function PlannedTab({ session, units }: { session: SessionModel; units: UnitSystem }) {
  const tags = toSessionTags(session);
  const metrics = toDetailMetrics(session, units);
  const segments = toSessionSegments(session);
  const bands = toChartBands(session);
  const sets = toWorkoutSets(session, units);
  const connections = toConnectionRows(session.connections);
  const footnote = toEstimateFootnote(session);

  return (
    <View style={styles.tab}>
      {tags.length > 0 ? (
        <View style={styles.tags}>
          {tags.map(tag => (
            <Chip key={tag.label} {...tag} />
          ))}
        </View>
      ) : null}

      {metrics.length > 0 ? <MetricGrid metrics={metrics} /> : null}

      {footnote ? (
        <ThemedText themeColor="textSecondary" style={styles.footnote}>
          {footnote}
        </ThemedText>
      ) : null}

      {segments.length > 0 ? (
        <IntervalChart
          segments={segments}
          bands={bands}
          totalMinutes={session.chartSeconds !== null ? session.chartSeconds / 60 : 0}
          tickEvery={session.tickEveryMinutes ?? undefined}
          height={72}
        />
      ) : null}

      {session.coachName && session.coachNote ? (
        <CoachNote coach={session.coachName} note={session.coachNote} />
      ) : null}

      {sets.length > 0 ? (
        <View style={styles.section}>
          <SectionHeading icon="list.bullet" label="Workout steps" />
          <WorkoutSteps sets={sets} />
        </View>
      ) : null}

      {connections.length > 0 ? (
        <View style={styles.section}>
          <SectionHeading icon="link" label="Connections" />
          <View style={styles.connections}>
            {connections.map(connection => (
              <ConnectionRow key={connection.title} {...connection} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function CompletedTab({
  session,
  activity,
  units,
  onUncomplete,
  busy,
}: {
  session: SessionModel;
  activity: ActivityModel;
  units: UnitSystem;
  onUncomplete: () => Promise<void>;
  busy: boolean;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const metrics = toActivityMetrics(activity, units);
  const charts = toStreamCharts(activity, units, activity.discipline);
  const review = toReviewLabel(activity);
  /* The polyline is drawn at explicit pixels, so the card's own padding has to
     be taken off the page width here rather than left to the layout. */
  const mapWidth = width - Gutter * 2 - Spacing.three * 2;

  return (
    <View style={styles.tab}>
      <ThemedText themeColor="textSecondary" style={styles.recordedTitle}>
        {activity.title}
      </ThemedText>

      {activity.links.length > 0 ? (
        <View style={styles.links}>
          <ThemedText themeColor="textSecondary" style={styles.linksLabel}>
            View on
          </ThemedText>
          {activity.links.map(link => (
            <View
              key={link.provider}
              style={[styles.linkBadge, { borderColor: theme.backgroundSelected }]}>
              <Icon
                name={link.provider === 'strava' ? 'bolt.fill' : 'triangle.fill'}
                size={13}
                tintColor={link.provider === 'strava' ? Accents.speed : Accents.recovery}
              />
            </View>
          ))}
        </View>
      ) : null}

      {activity.route.length > 1 ? (
        <ThemedView
          type="backgroundElement"
          style={[styles.map, { borderColor: theme.backgroundSelected }]}>
          <RouteLine
            points={activity.route}
            width={mapWidth}
            height={180}
            color={Accents.equipment}
            stroke={3}
          />
        </ThemedView>
      ) : null}

      {metrics.length > 0 ? <MetricGrid metrics={metrics} /> : null}

      {review ? (
        <View style={[styles.review, { borderColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.reviewLabel}>{review}</ThemedText>
          <Icon name="chevron.down" size={14} tintColor={theme.textSecondary} />
        </View>
      ) : null}

      {activity.laps.length > 1 ? (
        <SectionCard
          title="Laps"
          icon="arrow.trianglehead.2.clockwise.rotate.90"
          iconAccent={Accents.equipment}
          badge={`${activity.laps.length} total`}>
          <LapsChart
            bars={toLapBars(activity.laps)}
            yLabels={toLapAxis(activity.laps)}
            unitLabel={units === 'imperial' ? '/mi' : '/km'}
            color={Accents.equipment}
          />
        </SectionCard>
      ) : null}

      {charts.map(chart => (
        <SectionCard
          key={chart.kind}
          title={chart.title}
          icon={chart.icon}
          iconAccent={chart.color}
          badge={chart.badge}>
          <StreamChart
            points={chart.points}
            color={chart.color}
            yLabels={chart.yLabels}
            xLabels={chart.xLabels}
            min={chart.min}
            max={chart.max}
            average={chart.average}
            invert={chart.invert}
          />
        </SectionCard>
      ))}

      {session.completion ? (
        <Pressable
          onPress={onUncomplete}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Uncomplete workout"
          style={({ pressed }) => [
            styles.uncomplete,
            { borderColor: Accents.speed },
            (pressed || busy) && styles.pressed,
          ]}>
          <Icon name="arrow.uturn.backward" size={14} tintColor={Accents.speed} />
          <ThemedText style={[styles.uncompleteLabel, { color: Accents.speed }]}>
            Uncomplete workout
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function SectionHeading({ icon, label }: { icon: 'list.bullet' | 'link'; label: string }) {
  const theme = useTheme();

  return (
    <View style={styles.sectionHeading}>
      <Icon name={icon} size={14} tintColor={theme.textSecondary} />
      <ThemedText themeColor="textSecondary" style={styles.sectionLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  empty: {
    fontSize: 15,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: Gutter,
    paddingTop: Spacing.three,
    /* Clears the floating tab bar so the last card is reachable. */
    paddingBottom: TabBarHeight + Spacing.six,
  },
  header: {
    gap: Spacing.two,
  },
  dateLine: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  disciplineIcon: {
    /* Nudges the glyph onto the title's optical baseline. */
    marginTop: 3,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 31,
  },
  status: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  rule: {
    height: 1,
    marginTop: Spacing.one,
  },
  tab: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  footnote: {
    fontSize: 11,
    /* Pulled up against the grid it annotates, rather than floating midway
       between the figures and the chart below. */
    marginTop: -Spacing.two,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
  },
  connections: {
    gap: Spacing.two,
  },
  recordedTitle: {
    fontSize: 14,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  linksLabel: {
    fontSize: 13,
  },
  linkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    overflow: 'hidden',
  },
  review: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: 600,
  },
  uncomplete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  uncompleteLabel: {
    fontSize: 14,
    fontWeight: 600,
  },
  tabBar: {
    position: 'absolute',
    left: Gutter,
    right: Gutter,
    bottom: Spacing.three,
  },
  close: {
    position: 'absolute',
    left: Gutter,
    bottom: TabBarHeight + Spacing.four,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  fabInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
