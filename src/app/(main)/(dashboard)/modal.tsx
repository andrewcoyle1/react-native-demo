import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';

/**
 * A fully custom alert.
 *
 * Presented as a `transparentModal` (see the dashboard layout), so the screen
 * underneath stays mounted and visible. Everything you see here — the dim scrim
 * and the centred card — is ordinary React Native, which is the point: unlike
 * `Alert.alert` you can put anything in it.
 */
export default function DashboardModal() {
  useScreenTracking('Dashboard alert');

  const [working, setWorking] = useState(false);

  function dismiss() {
    router.back();
  }

  async function confirm() {
    setWorking(true);
    // Stand-in for the real action; the busy state is here to show the pattern.
    await new Promise(resolve => setTimeout(resolve, 400));
    router.back();
  }

  return (
    // The scrim doubles as a dismiss target, which is what people expect from a
    // tap outside an alert. `entering`/`exiting` fade it independently of the
    // route transition so the dim doesn't pop in.
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      style={styles.scrim}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={StyleSheet.absoluteFill}
        onPress={dismiss}
      />

      {/* Stop presses on the card itself from reaching the scrim behind it. */}
      <Pressable>
        <ThemedView
          type="background"
          accessibilityViewIsModal
          style={styles.card}>
          <ThemedText type="subtitle" style={styles.centered}>
            Start a session?
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            This is a plain view, so it can hold anything — inputs, images, a chart —
            rather than the fixed title-and-buttons of a native alert.
          </ThemedText>

          <ThemedView type="background" style={styles.actions}>
            <ActionButton title="Start" busy={working} onPress={confirm} />
            <ActionButton title="Cancel" variant="secondary" onPress={dismiss} />
          </ThemedView>
        </ThemedView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    // A little lift so the card reads as floating above the scrim.
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  centered: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
  },
});
