/**
 * The app's persistent header.
 *
 * It sits above the tab navigator rather than inside it, so it takes no part in
 * the tab wipe — the page name simply changes while the bar itself stays put.
 * A header owned by the tabs cannot do this: the navigator applies the animated
 * scene style to a container that wraps the header as well as the content, so
 * it would travel with the screen.
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { TrialBadge } from './trial-badge';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Liquid glass is iOS 26+; elsewhere the cluster needs a solid fill to read. */
const glassAvailable = isLiquidGlassAvailable();

/** The name shown for each tab. The dashboard wears the wordmark. */
const TITLES: Record<string, string> = {
  '/': 'stamina',
  '/plan': 'Plan',
  '/activities': 'Activities',
  '/trends': 'Trends',
  '/profile': 'Profile',
};

const ACTIONS: { icon: SFSymbol; label: string; href: string }[] = [
  { icon: 'questionmark.message', label: 'Share feedback', href: '/modal' },
  { icon: 'bell', label: 'Notifications', href: '/sheet' },
  { icon: 'person.crop.circle', label: 'Profile', href: '/profile' },
];

export function AppHeader() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // A pushed route (profile, feedback) covers this header, so the last known
  // tab title is the sensible thing to keep showing underneath.
  const title = TITLES[pathname] ?? TITLES['/'];

  return (
    <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <View style={styles.bar}>
        {/* Keyed on the title so a changed name is a new element, which is what
            gives it something to fade in from. */}
        <Animated.View key={title} entering={FadeIn.duration(220)}>
          <ThemedText style={styles.title}>{title}</ThemedText>
        </Animated.View>

        {/* The badge's position is decided by the width of the title beside it,
            so a shorter name would snap it leftwards. `LinearTransition` picks
            up that layout change and carries it across instead. */}
        <Animated.View layout={LinearTransition.duration(280)}>
          <TrialBadge />
        </Animated.View>

        <View style={styles.spacer} />

        <GlassView
          glassEffectStyle="regular"
          style={[styles.actions, !glassAvailable && { backgroundColor: theme.backgroundElement }]}>
          {ACTIONS.map(action => (
            <Pressable
              key={action.icon}
              onPress={() => router.push(action.href as never)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              hitSlop={Spacing.one}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <SymbolView name={action.icon} size={22} tintColor={theme.text} />
            </Pressable>
          ))}
        </GlassView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    /* Opaque: the scenes wipe underneath it and must not show through. */
    zIndex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 56,
    paddingHorizontal: Spacing.three,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
    borderRadius: 999,
    overflow: 'hidden',
  },
  action: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.5,
  },
});
