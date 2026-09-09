import { router, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Carousel } from '@/components/carousel';
import { Card, Screen } from '@/components/screen';
import { PlanCard } from '@/components/plan-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useAuth, type AuthUser } from '@/providers/auth-provider';

/**
 * Temporary source of the greeting.
 *
 * Auth only knows an email address, so this derives something usable from it.
 * Replace this with the user profile provider once it exists — the display name
 * belongs there, not inferred from credentials.
 *
 * Returns the whole line rather than just the name, so the "no name" case drops
 * the comma too instead of rendering "Welcome back, ".
 */
function greeting(user: AuthUser) {
  if (user.isAnonymous || !user.email) {
    return 'Welcome back';
  }

  const localPart = user.email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!localPart) {
    return 'Welcome back';
  }

  const name = localPart.charAt(0).toUpperCase() + localPart.slice(1);
  return `Welcome back, ${name}`;
}

export default function DashboardScreen() {
  useScreenTracking('Dashboard');

  const { user } = useAuth();

  // The root gate only mounts (main) when a user exists; this narrows the type.
  if (!user) {
    return null;
  }


  return (
    <Screen>
      {/* Toolbar items live in the page, not the layout, so their handlers can
          reach this screen's state. `placement="right"` puts them in the native
          header's trailing area. */}
      {/* One toolbar per placement: if two are rendered for the same screen, the
          last one wins and the earlier one is silently dropped. Add more items as
          siblings inside this block rather than adding a second block. */}
      <Stack.Toolbar placement="right">
        {/* Items sit horizontally in the header's trailing area, in source order. */}
        <Stack.Toolbar.Button icon="questionmark.bubble" onPress={() => router.push('/modal')} />
        <Stack.Toolbar.Button
          icon="bell"
          onPress={() => router.push('/sheet')}
        />
        <Stack.Toolbar.Button
          icon="person.crop.circle"
          onPress={() => router.push('/account')}
        />

      </Stack.Toolbar>

      <ThemedView style={styles.carousel}>
        {/* `style` lands last in ThemedText's style array, so it overrides the
            preset's weight while keeping its size and line height. */}
        <ThemedText style={styles.greeting}>
          {greeting(user)}
        </ThemedText>

        {/* A fixed height keeps the dots still while swiping between pages of
            different lengths. `flex: 1` on each Card makes it fill that height. */}
        <Carousel height={260} accessibilityLabel="Dashboard highlights">
          <PlanCard
            title1="Current - Prep Plan"
            title2="306 days"
            title3="until IRONMAN 70.3 Luxembourg"
            title4="Prep plan week 1 of 24 - Base Phase"
            /* Remote test photo, to prove the wiring. Swap for real artwork. */
            backgroundImage="https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800"
            /* 25 weeks of planned hours; week 2 is in progress. Placeholder
               until the plan service lands. */
            bars={[8, 9, 7, 10, 11, 9, 12, 13, 10, 14, 12, 15, 13, 16, 14, 11, 17, 15, 18, 16, 13, 19, 17, 12, 8]}
            currentBarIndex={1}
            currentBarProgress={0.35}
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
      </ThemedView>

    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontWeight: 700,
    fontSize: 20,
  },
  slide: {
    flex: 1,
  },
  carousel: {
    gap: Spacing.three,
  },
});
