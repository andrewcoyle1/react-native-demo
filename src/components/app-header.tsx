/**
 * The app's persistent header.
 *
 * It sits above the tab navigator rather than inside it, so it takes no part in
 * the tab wipe — the page name simply changes while the bar itself stays put.
 * A header owned by the tabs cannot do this: the navigator applies the animated
 * scene style to a container that wraps the header as well as the content, so
 * it would travel with the screen.
 *
 * Geometry and colour are measured off the design at 3x: the title and the
 * action glyphs sit on a shared centre line, the actions are 40pt columns
 * right-aligned to the page gutter, and nothing sits behind them.
 */
import { router, usePathname } from 'expo-router';
import { Icon } from './icon';
import type { SFSymbol } from 'expo-symbols';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { TrialBadge } from './trial-badge';

import { useTheme } from '@/hooks/use-theme';

/** Measured off the design, in points. */
const Header = {
  /** Page gutter, matching the cards below. */
  gutter: 16,
  /** The design starts its header immediately below the safe-area inset. */
  topGap: 0,
  /** Row height, which puts the title's centre line where the design has it. */
  height: 33,
  /** Between the title and the badge. */
  titleGap: 10,
  /** Each action's touch column; three of them end at the gutter. */
  action: 40,
  iconSize: 26,
  /** The avatar is a 24pt disc in the design, not a glyph on its own. */
  avatar: 24,
} as const;

/** The name shown for each tab. The dashboard wears the wordmark. */
const TITLES: Record<string, string> = {
  '/': 'stamina',
  '/plan': 'Plan',
  '/activities': 'Activities',
  '/trends': 'Trends',
  '/profile': 'Profile',
};

const ACTIONS: { icon: SFSymbol; label: string; href: string; avatar?: boolean }[] = [
  { icon: 'questionmark.bubble', label: 'Share feedback', href: '/modal' },
  { icon: 'bell', label: 'Notifications', href: '/sheet' },
  { icon: 'person.crop.circle', label: 'Profile', href: '/profile', avatar: true },
];

export function AppHeader() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // A pushed route (feedback, notifications) covers this header, so the last
  // known tab title is the sensible thing to keep showing underneath.
  const title = TITLES[pathname] ?? TITLES['/'];

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + Header.topGap, backgroundColor: theme.background },
      ]}>
      <View style={styles.bar}>
        {/* Keyed on the title so a changed name is a new element, which is what
            gives it something to fade in from. */}
        <Animated.View key={title} entering={FadeIn.duration(220)}>
          <ThemedText style={[styles.title, { color: theme.headerTitle }]}>{title}</ThemedText>
        </Animated.View>

        {/* The badge's position is decided by the width of the title beside it,
            so a shorter name would snap it leftwards. `LinearTransition` picks
            up that layout change and carries it across instead. */}
        <Animated.View style={styles.badge} layout={LinearTransition.duration(280)}>
          <TrialBadge />
        </Animated.View>

        <View style={styles.spacer} />

        {ACTIONS.map(action => {
          const current = pathname === action.href;

          return (
            <Pressable
              key={action.icon}
              /* Already there: navigating again would replay the tab wipe and
                 land on the screen the user is looking at. The tab bar makes the
                 same check against its own focused route. */
              onPress={() => {
                if (!current) {
                  router.push(action.href as never);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityState={{ selected: current }}
              style={({ pressed }) => [styles.action, pressed && !current && styles.pressed]}>
              {action.avatar ? (
                /* A ringed disc, which is the shape the design has here. It
                   holds the glyph until a profile photo exists to put inside. */
                <View style={[styles.avatar, { borderColor: theme.icon }]}>
                  <Icon
                    name={action.icon}
                    size={Header.avatar}
                    weight="light"
                    tintColor={theme.icon}
                  />
                </View>
              ) : (
                <Icon
                  name={action.icon}
                  size={Header.iconSize}
                  /* The design's strokes are thinner than SF's default weight. */
                  weight="light"
                  tintColor={theme.icon}
                />
              )}
            </Pressable>
          );
        })}
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
    height: Header.height,
    /* The same gutter both sides. The last action's 40pt column then ends on
       it, putting its glyph 36pt in from the edge, where the design has it. */
    paddingHorizontal: Header.gutter,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
  },
  badge: {
    marginLeft: Header.titleGap,
  },
  spacer: {
    flex: 1,
  },
  action: {
    width: Header.action,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  avatar: {
    width: Header.avatar,
    height: Header.avatar,
    borderRadius: Header.avatar / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.5,
  },
});
