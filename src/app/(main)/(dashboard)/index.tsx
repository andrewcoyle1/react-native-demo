import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ActionRow } from '@/components/action-row';
import { AddPlanCard } from '@/components/add-plan-card';
import { Carousel } from '@/components/carousel';
import { DayHeading } from '@/components/day-heading';
import { PlanCard } from '@/components/plan-card';
import { PromptCard } from '@/components/prompt-card';
import { Card } from '@/components/screen';
import { SectionScreen } from '@/components/section-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkoutCard } from '@/components/workout-card';
import { Disciplines, SAMPLE_WEEK, type PlannedSession } from '@/constants/sample-week';
import { Accents, Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useAuth } from '@/providers/auth-provider';

/**
 * One section per day. `meta` carries the offset the heading needs, so the
 * header does not have to parse it back out of the section's id.
 */
const SECTIONS = SAMPLE_WEEK.map(day => ({
  id: `day-${day.dayOffset}`,
  meta: day.dayOffset,
  data: day.sessions,
}));

export default function DashboardScreen() {
  useScreenTracking('Dashboard');

  const { user } = useAuth();

  // The root gate only mounts (main) when a user exists; this narrows the type.
  if (!user) {
    return null;
  }

  return (
    <SectionScreen
      sections={SECTIONS}
      keyExtractor={(session: PlannedSession) => session.id}
      renderHeader={section => <DayHeading dayOffset={section.meta} />}
      renderItem={session => (
        <WorkoutCard
          title={session.title}
          icon={Disciplines[session.discipline].icon}
          iconAccent={Disciplines[session.discipline].accent}
          status={session.status}
          tags={session.tags}
          metrics={session.metrics}
          segments={session.segments}
          totalMinutes={session.totalMinutes}
          tickEvery={session.tickEvery}
          coach={session.coach}
          note={session.note}
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
            <PlanCard
              title1="Current - Prep Plan"
                title2="305 days"
                title3="until IRONMAN 70.3 Luxembourg"
                title4="Prep plan week 1 of 24 - Base Phase"
                /* Remote test photo, to prove the wiring. Swap for real artwork. */
                backgroundImage="https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800"
                /* 25 weeks of planned hours; week 2 is in progress. Placeholder
                   until the plan service lands. */
                bars={[8, 9, 7, 10, 11, 9, 12, 13, 10, 14, 12, 15, 13, 16, 14, 11, 17, 15, 18, 16, 13, 19, 17, 12, 8]}
                currentBarIndex={1}
                currentBarProgress={0.35}
                onMenuPress={() => router.push('/sheet')}
                style={styles.slide}
              />

              <Card title="This week" style={styles.slide}>
                <ThemedText type="small" themeColor="textSecondary">
                  Placeholder — weekly totals and streak.
                </ThemedText>
              </Card>

            <Card title="Next session" style={styles.slide}>
              <ThemedText type="small" themeColor="textSecondary">
                Placeholder — what is scheduled next.
              </ThemedText>
            </Card>
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
  },
});
