import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { ActionRow } from '@/components/action-row';
import { AddPlanCard } from '@/components/add-plan-card';
import { Carousel } from '@/components/carousel';
import { DayHeading } from '@/components/day-heading';
import { PlanCard } from '@/components/plan-card';
import { PromptCard } from '@/components/prompt-card';
import { SectionScreen } from '@/components/section-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkoutCard } from '@/components/workout-card';
import { Accents, Spacing } from '@/constants/theme';
import { daysBetween, toDateKey, type DateRange } from '@/domain/training';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { toPlanCardProps } from '@/presenters/plan-presenter';
import { toWorkoutCardProps } from '@/presenters/session-presenter';
import { useAuth } from '@/providers/auth-provider';
import { useSessions, type SessionModel } from '@/providers/sessions-provider';
import { useTraining } from '@/providers/training-provider';
import { TrendsProvider, useTrends } from '@/providers/trends-provider';
import { services } from '@/services/container';

/** Monday-to-Sunday around today, in the athlete's own local calendar. */
function currentWeekWindow(): DateRange {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toDateKey(monday), to: toDateKey(sunday) };
}

export default function DashboardScreen() {
  const window = useMemo(() => currentWeekWindow(), []);

  return (
    <TrendsProvider window={window} service={services.trends}>
      <DashboardBody />
    </TrendsProvider>
  );
}

function DashboardBody() {
  useScreenTracking('Dashboard');

  const { user } = useAuth();
  const { state, byDate } = useSessions();
  const { plans: planState, raceFor } = useTraining();
  const { state: trends } = useTrends();

  // An empty list while loading or on error: the carousel keeps its "add plan"
  // page, which is what an athlete with no plans should see anyway.
  const plans = planState.status === 'ready' ? planState.data : [];

  // Only meaningful for the plan under way, and only once it has arrived —
  // an active plan card falls back to the plan's own stored progress until it
  // does, rather than showing a zero that is not really zero.
  const actualHoursThisWeek = trends.status === 'ready' ? trends.data.completed.durationSeconds / 3600 : undefined;

  /**
   * One section per day that has sessions. `meta` carries the offset the heading
   * needs, so the header does not have to parse it back out of the date.
   *
   * Days are taken from the data rather than generated, so a rest day simply has
   * no section — which is what the design shows.
   */
  const sections = useMemo(() => {
    const today = toDateKey(new Date());
    return [...byDate.entries()].map(([date, sessions]) => ({
      id: `day-${date}`,
      meta: daysBetween(today, date),
      data: sessions,
    }));
  }, [byDate]);

  // The root gate only mounts (main) when a user exists; this narrows the type.
  if (!user) {
    return null;
  }

  return (
    <SectionScreen
      sections={sections}
      keyExtractor={(session: SessionModel) => session.id}
      renderHeader={section => <DayHeading dayOffset={section.meta} />}
      renderItem={session => (
        <WorkoutCard
          {...toWorkoutCardProps(session, 'metric')}
          onMenuPress={() => router.push('/sheet')}
        />
      )}
      ListHeaderComponent={
        <ThemedView style={styles.listHeader}>
          {/* Outside the padded block below: the carousel runs to the screen
              edges so the neighbouring pages can peek in. */}
          {/* A fixed height keeps the indicators still while swiping between
              pages of different lengths. `flex: 1` on each page's card makes it
              fill that height. */}
          <Carousel
            height={272}
            accessibilityLabel="Dashboard highlights"
            addPage={<AddPlanCard onPress={() => router.push('/sheet')} />}>
            {/* One card per plan the backend has generated: the current one
                first, then anything upcoming. The countdowns and week numbers
                are computed from dates by the presenter, not typed in. */}
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                {...toPlanCardProps(
                  plan,
                  raceFor(plan),
                  undefined,
                  plan.status === 'current' ? actualHoursThisWeek : undefined,
                )}
                onMenuPress={() => router.push('/sheet')}
                style={styles.slide}
              />
            ))}
          </Carousel>

          <ThemedView style={styles.listHeaderPadded}>
            <ActionRow
              title="Update Your Schedule"
              subtitle="Your days, commitments and B/C races"
              icon="calendar"
              accent={Accents.schedule}
              onPress={() => router.push('/sheet')}
            />
          </ThemedView>
        </ThemedView>
      }
      ListFooterComponent={
        <ThemedView style={styles.listFooter}>
          {/* A failed read is said plainly rather than left as an empty week,
              which would read as "nothing planned" and be a lie. */}
          {state.status === 'error' ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.error}>
              Your plan could not be loaded. {state.message}
            </ThemedText>
          ) : null}
          <PromptCard
            title="Looking for more workouts?"
            body="View your full training plan to see workouts further in the future."
            icon="calendar"
            accent={Accents.commitment}
            onPress={() => router.push('/plan')}
          />
        </ThemedView>
      }>
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
  },
  /* The list's rows carry their own horizontal padding, so the header and footer
     have to bring their own rather than inheriting it from a shared container.
     The carousel is the exception — it is deliberately full-bleed, so the
     padding sits on the block beneath it instead of on the whole header. */
  listHeader: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  listHeaderPadded: {
    paddingHorizontal: Spacing.three,
  },
  listFooter: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
  error: {
    textAlign: 'center',
  },
});
