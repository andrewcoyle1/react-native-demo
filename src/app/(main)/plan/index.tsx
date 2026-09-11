import { Icon } from '@/components/icon';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ProgressRing } from '@/components/progress-ring';
import { SectionScreen } from '@/components/section-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accents, Spacing, Zones } from '@/constants/theme';
import { formatDurationWords } from '@/domain/format';
import { addDays, daysBetween, toDateKey, type DateKey } from '@/domain/training';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import {
  toDisciplineSummaries,
  toPlannedDays,
  toWeekTotals,
  type PlannedItemProps,
} from '@/presenters/plan-week-presenter';
import { ActivityWindowProvider, useActivityWindow } from '@/providers/activities-provider';
import { SessionsProvider, useSessions } from '@/providers/sessions-provider';
import { useTraining, type PlanModel } from '@/providers/training-provider';
import { services } from '@/services/container';

/** How far a week travels as it leaves, as a fraction of the screen width. */
const TravelFraction = 0.28;

/** Past this much of a drag — or this much speed — the week commits. */
const CommitFraction = 0.2;
const CommitVelocity = 500;

/** Both slices render an empty week until they are ready; neither blocks. */
function sessionsOf(state: ReturnType<typeof useSessions>['state']) {
  return state.status === 'ready' ? state.data : [];
}

function activitiesOf(state: ReturnType<typeof useActivityWindow>['state']) {
  return state.status === 'ready' ? state.data : [];
}

/** The Monday of the week `date` falls in. */
function mondayOf(date: Date): DateKey {
  // getDay is 0 on Sunday, which belongs to the week that began six days back.
  return addDays(toDateKey(date), -((date.getDay() + 6) % 7));
}

/** Which week of the plan a Monday is, 0-based, or null outside the plan. */
function weekIndexOf(plan: PlanModel | null, weekStart: DateKey): number | null {
  if (!plan) {
    return null;
  }
  const index = Math.floor(daysBetween(mondayOf(new Date(`${plan.startDate}T00:00:00`)), weekStart) / 7);
  return index >= 0 && index < plan.weeks ? index : null;
}

/**
 * Owns the week being shown, and mounts the two windowed reads over it.
 *
 * The providers live here rather than in the tab's layout because stepping a
 * week has to change the window they read — a provider above this component
 * could not see the state that changes.
 */
export default function PlanScreen() {
  useScreenTracking('Plan');

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const window = useMemo(() => ({ from: weekStart, to: addDays(weekStart, 6) }), [weekStart]);

  return (
    <SessionsProvider window={window} service={services.sessions}>
      <ActivityWindowProvider window={window} service={services.activities}>
        <PlanWeekView weekStart={weekStart} onChangeWeek={setWeekStart} />
      </ActivityWindowProvider>
    </SessionsProvider>
  );
}

function PlanWeekView({
  weekStart,
  onChangeWeek,
}: {
  weekStart: DateKey;
  onChangeWeek: (weekStart: DateKey) => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const { state: sessionState } = useSessions();
  const { state: activityState } = useActivityWindow();
  const { plans } = useTraining();

  // The plan under way names the week stepper. Null until it has loaded.
  const currentPlan =
    plans.status === 'ready' ? (plans.data.find(plan => plan.status === 'current') ?? null) : null;

  const weekIndex = weekIndexOf(currentPlan, weekStart);

  // Stepping is bounded by the plan when there is one. With no plan loaded there
  // is nothing to bound it by, so both directions stay open.
  const canGoBack = currentPlan === null || (weekIndex !== null && weekIndex > 0);
  const canGoForward =
    currentPlan === null || (weekIndex !== null && weekIndex < currentPlan.weeks - 1);

  /**
   * How far the week is displaced, in points.
   *
   * Drives both the drag and the commit, so a swipe that becomes a step never
   * jumps: the finger hands the week over to the animation at whatever offset it
   * had reached.
   */
  const translateX = useSharedValue(0);

  /*
   * These four are plain functions rather than `useCallback`/`useMemo` values.
   * A Reanimated shared value is stable for the life of the component but must
   * not appear in a dependency array — the compiler's rules then read every
   * write below as mutating a hook argument — and leaving it out trips
   * exhaustive-deps instead. Without the memo hooks the conflict disappears, and
   * the React Compiler memoises them anyway.
   */
  const step = (direction: number) => {
    onChangeWeek(addDays(weekStart, 7 * direction));
  };

  /**
   * Sends the current week out and brings the next one in.
   *
   * `direction` is +1 for the week ahead, which leaves to the left and arrives
   * from the right. The week only changes once the outgoing half has finished,
   * so the content never swaps under a stationary view.
   */
  const commit = (direction: number) => {
    // Guarded here as well as at the callers, so the bound is stated once and
    // holds however the step was asked for.
    if (direction === 1 ? !canGoForward : !canGoBack) {
      return;
    }

    const travel = width * TravelFraction;

    translateX.value = withTiming(
      -direction * travel,
      { duration: 160, easing: Easing.in(Easing.cubic) },
      finished => {
        if (!finished) {
          return;
        }
        runOnJS(step)(direction);
        translateX.value = direction * travel;
        translateX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      },
    );
  };

  const settle = () => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 220 });
  };

  const pan = Gesture.Pan()
    // Only a clearly horizontal drag takes the gesture; anything with a vertical
    // intent is left to the list underneath.
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onUpdate(event => {
      const allowed = event.translationX > 0 ? canGoBack : canGoForward;
      // Dragging towards a week that does not exist still moves, but heavily
      // damped, so the edge of the plan is felt rather than simply dead.
      translateX.value = allowed ? event.translationX * 0.5 : event.translationX * 0.12;
    })
    .onEnd(event => {
      const direction = event.translationX < 0 ? 1 : -1;
      const allowed = direction === 1 ? canGoForward : canGoBack;
      const far = Math.abs(event.translationX) > width * CommitFraction;
      const fast = Math.abs(event.velocityX) > CommitVelocity;

      if (allowed && (far || fast)) {
        runOnJS(commit)(direction);
      } else {
        runOnJS(settle)();
      }
    });

  const sliding = useAnimatedStyle(() => {
    const travel = width * TravelFraction;
    // Fades as it travels, so the swap at the far end is hidden — the same
    // crossfade the tab wipe uses.
    const progress = Math.min(Math.abs(translateX.value) / travel, 1);

    return {
      transform: [{ translateX: translateX.value }],
      opacity: 1 - progress * 0.85,
    };
  });

  const summaries = useMemo(
    () => toDisciplineSummaries(sessionsOf(sessionState), activitiesOf(activityState)),
    [sessionState, activityState],
  );

  /** One section per month, which is how the design groups the day rows. */
  const sections = useMemo(() => {
    const days = toPlannedDays(sessionsOf(sessionState), activitiesOf(activityState), 'metric');
    if (days.length === 0) {
      return [];
    }

    const first = new Date(`${days[0].id}T00:00:00`);
    const label = `${first.getFullYear()}  ${first
      .toLocaleDateString('en-US', { month: 'short' })
      .toUpperCase()}`;

    return [{ id: days[0].id.slice(0, 7), meta: label, data: days }];
  }, [sessionState, activityState]);

  /** The week's totals — the three rings added up. */
  const total = useMemo(() => {
    const { plannedSeconds, doneSeconds } = toWeekTotals(
      sessionsOf(sessionState),
      activitiesOf(activityState),
    );
    return { planned: formatDurationWords(plannedSeconds), done: formatDurationWords(doneSeconds) };
  }, [sessionState, activityState]);

  return (
    <GestureDetector gesture={pan}>
      {/* The whole week slides, stepper included: the week is the unit that
          moves, and leaving the controls behind would read as the content
          changing under them rather than the week changing. */}
      <Animated.View style={[styles.container, sliding]}>
        <SectionScreen
          sections={sections}
      keyExtractor={day => day.id}
      renderItem={day => (
        <View style={styles.day}>
          {/* The date gutter and its connector run the height of the day, so a
              day with several sessions still reads as one group. */}
          <View style={styles.gutter}>
            <ThemedText themeColor="textSecondary" style={styles.weekday}>
              {day.weekday.toUpperCase()}
            </ThemedText>
            <ThemedText style={styles.dayNumber}>{day.day}</ThemedText>
            <View style={[styles.connector, { backgroundColor: theme.backgroundSelected }]} />
          </View>

          <View style={styles.dayItems}>
            {day.items.map(item => (
              <PlanRow key={item.id} item={item} />
            ))}
          </View>
        </View>
      )}
      renderHeader={section => (
        <View style={styles.monthRow}>
          <ThemedText themeColor="textSecondary" style={styles.month}>
            {section.meta}
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit plan"
            style={({ pressed }) => [
              styles.editPlan,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <Icon name="pencil" size={15} tintColor={theme.text} />
            <ThemedText style={styles.editPlanText}>Edit plan</ThemedText>
          </Pressable>
        </View>
      )}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          {/* Week stepper. The arrows flank a centred block so the week number
              stays put as the phase label either side changes length. */}
          <View style={styles.weekNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              accessibilityState={{ disabled: !canGoBack }}
              disabled={!canGoBack}
              onPress={() => commit(-1)}
              hitSlop={Spacing.two}
              style={({ pressed }) => [!canGoBack && styles.arrowDisabled, pressed && styles.pressed]}>
              <Icon name="chevron.left" size={22} tintColor={theme.textSecondary} />
            </Pressable>

            <View style={styles.weekBlock}>
              <View style={styles.weekMeta}>
                <Icon name="clock" size={14} tintColor={Accents.info} />
                <ThemedText style={[styles.metaText, { color: Accents.info }]}>
                  {currentPlan ? `${currentPlan.name.split(' ')[0].toUpperCase()} plan` : ''}
                </ThemedText>
              </View>

              <ThemedText style={styles.weekTitle}>
                Week {weekIndex !== null ? weekIndex + 1 : '—'}
                <ThemedText themeColor="textSecondary" style={styles.weekTotal}>
                  {' '}
                  /{currentPlan?.weeks ?? '—'}
                </ThemedText>
              </ThemedText>

              <View style={styles.weekMeta}>
                <Icon name="chart.line.uptrend.xyaxis" size={14} tintColor={Zones.hard} />
                <ThemedText style={[styles.metaText, { color: Zones.hard }]}>
                  {currentPlan?.phase ? `${currentPlan.phase.split(' ')[0].toUpperCase()} phase` : ''}
                </ThemedText>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next week"
              accessibilityState={{ disabled: !canGoForward }}
              disabled={!canGoForward}
              onPress={() => commit(1)}
              hitSlop={Spacing.two}
              style={({ pressed }) => [
                !canGoForward && styles.arrowDisabled,
                pressed && styles.pressed,
              ]}>
              <Icon name="chevron.right" size={22} tintColor={theme.textSecondary} />
            </Pressable>
          </View>

          <ThemedView
            type="backgroundElement"
            style={[styles.summary, { borderColor: theme.backgroundSelected }]}>
            <View style={styles.rings}>
              {summaries.map(discipline => (
                <View key={discipline.id} style={styles.ring}>
                  <ProgressRing
                    progress={discipline.progress}
                    color={discipline.accent}
                    size={84}
                    stroke={7}>
                    <Icon name={discipline.icon} size={30} tintColor={discipline.accent} />
                  </ProgressRing>

                  <ThemedText style={styles.ringLine}>{withUnits(discipline.done)}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.ringPlanned}>
                    {discipline.planned.toUpperCase()}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={[styles.total, { borderTopColor: theme.backgroundSelected }]}>
              <Icon name="clock" size={16} tintColor={Accents.recovery} />
              <ThemedText themeColor="textSecondary" style={styles.totalText}>
                TOTAL: {total.done.toUpperCase()} / {total.planned.toUpperCase()}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Swap units"
                hitSlop={Spacing.two}>
                <Icon
                  name="arrow.left.arrow.right"
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            </View>
          </ThemedView>
        </View>
      }>
        </SectionScreen>
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Renders "1 hr 57 min" with the digits large and the units small.
 *
 * Splitting on whitespace is enough: every token is either a number or the unit
 * that follows it, and the unit is whatever is not a number.
 */
function withUnits(text: string) {
  return text.split(' ').map((token, index) =>
    /\d/.test(token) ? (
      <ThemedText key={index} style={styles.ringDone}>
        {index > 0 ? ' ' : ''}
        {token}
      </ThemedText>
    ) : (
      <ThemedText key={index} themeColor="textSecondary" style={styles.ringUnit}>
        {' '}
        {token.toUpperCase()}
      </ThemedText>
    ),
  );
}

function PlanRow({ item }: { item: PlannedItemProps }) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.row, { borderColor: theme.backgroundSelected }]}>
      <View style={styles.rowHeader}>
        <Icon name={item.icon} size={22} tintColor={item.accent} style={styles.rowIcon} />
        <ThemedText style={styles.rowTitle}>{item.title}</ThemedText>
      </View>

      <View style={styles.rowMetaLine}>
        <ThemedText themeColor="textSecondary" style={styles.rowMeta}>
          {item.target}
        </ThemedText>

        {item.commitment ? (
          <View style={styles.commitment}>
            <Icon
              name="arrow.triangle.2.circlepath"
              size={14}
              tintColor={Accents.commitment}
            />
            <ThemedText style={[styles.commitmentText, { color: Accents.commitment }]}>
              COMMITMENT
            </ThemedText>
          </View>
        ) : null}
      </View>

      {item.actual ? (
        <View style={styles.actual}>
          <ThemedText style={[styles.actualTitle, { color: Accents.schedule }]}>
            {item.actual.at} - {item.actual.title}
          </ThemedText>
          <View style={styles.actualStats}>
            {item.actual.stats.map(stat => (
              <ThemedText key={stat} style={styles.actualStat}>
                {stat}
              </ThemedText>
            ))}
          </View>
        </View>
      ) : null}

      {/* The status disc straddles the card's leading edge, tying the row to the
          date gutter beside it. */}
      {item.status !== 'none' ? (
        <View style={styles.statusSlot} pointerEvents="none">
          <View
            style={[
              styles.status,
              { backgroundColor: item.status === 'done' ? Accents.endurance : Accents.speed },
            ]}>
            <Icon
              name={item.status === 'done' ? 'checkmark' : 'xmark'}
              size={13}
              tintColor="#FFFFFF"
            />
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  /* Fills the tab beneath the sliding week, so the page colour shows through
     rather than the tab behind it as the week fades. */
  container: {
    flex: 1,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  /* The list's rows and headers carry their own gutter, so the list header has
     to bring its own rather than inheriting one from a shared container. */
  listHeader: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekBlock: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  weekMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  metaText: {
    fontSize: 14,
    fontWeight: 600,
  },
  weekTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 600,
  },
  weekTotal: {
    fontSize: 17,
    fontWeight: 500,
  },
  summary: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  rings: {
    flexDirection: 'row',
  },
  ring: {
    /* Equal thirds, so the rings sit on the card's natural gridlines. */
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  ringDone: {
    fontSize: 17,
    fontWeight: 600,
  },
  ringUnit: {
    fontSize: 12,
    fontWeight: 500,
  },
  ringLine: {
    marginTop: Spacing.two,
  },
  ringPlanned: {
    fontSize: 12,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  totalText: {
    /* Takes the slack so the swap button is pushed to the trailing edge while
       the label stays optically centred. */
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  month: {
    fontSize: 20,
    letterSpacing: 2,
  },
  editPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 40,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: 999,
  },
  editPlanText: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.6,
  },
  day: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gutter: {
    /* Wide enough to clear the status disc that straddles the card's edge. */
    width: 44,
    alignItems: 'flex-start',
  },
  weekday: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.6,
  },
  dayNumber: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 500,
  },
  connector: {
    /* Runs from under the date to the foot of the day's last card. */
    flex: 1,
    width: 1,
    marginTop: Spacing.two,
  },
  dayItems: {
    flex: 1,
    gap: Spacing.three,
  },
  row: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 600,
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowMeta: {
    fontSize: 13,
    letterSpacing: 0.4,
  },
  commitment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  commitmentText: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  actual: {
    gap: Spacing.one,
  },
  actualTitle: {
    fontSize: 14,
  },
  actualStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actualStat: {
    fontSize: 14,
  },
  /* Full height so the disc centres on the card whatever the row contains,
     rather than being pinned to a guessed offset from the top. */
  statusSlot: {
    position: 'absolute',
    left: -12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  status: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
