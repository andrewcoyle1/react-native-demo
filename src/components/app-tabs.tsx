/**
 * The signed-in tab navigator.
 *
 * JS tabs rather than `NativeTabs`, because a native `UITabBarController` hands
 * its transition to UIKit — a crossfade at best, with no hook for a directional
 * one. This navigator exposes `sceneStyleInterpolator`, which is what lets the
 * outgoing screen travel a full screen width instead of the built-in `shift`
 * preset's 50pt nudge.
 *
 * The cost is the tab bar: the native one came with the system's glass
 * treatment, so `AppTabBar` below rebuilds it with `GlassView`.
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { CommonActions } from 'expo-router/build/react-navigation/routers';

/** Liquid glass is iOS 26+; elsewhere the bar needs a solid fill to read. */
const glassAvailable = isLiquidGlassAvailable();

/**
 * How far a screen travels during a tab change, as a fraction of the width.
 *
 * Well under 1 on purpose: at a full width the outgoing and incoming screens
 * tile edge to edge and never overlap, so crossfading them only shows the page
 * through each in turn. A quarter width keeps them overlapping for most of the
 * transition, which is what lets them dissolve into one another.
 */
const TravelFraction = 0.25;

/**
 * Bar geometry, measured off the design at 3x and expressed in points.
 *
 * The side and bottom margins are fixed rather than derived from the safe-area
 * inset: the design floats the bar 20pt from the screen's edges, which sits
 * inside the home-indicator inset rather than clearing it.
 */
const Bar = {
  margin: 20,
  height: 66,
  /** Inside the capsule, before the four equal columns begin. */
  padding: 16,
  /** Point size that renders a glyph ~19.7pt tall, as the design's are. */
  iconSize: 26,
} as const;

/** Sampled from the design: neither is pure white or the theme's secondary. */
const IconTint = {
  active: '#E5E5E5',
  inactive: '#737373',
} as const;

/**
 * One entry per tab, in the order they appear — which is also the wipe order.
 *
 * `icon` is the resting glyph and `activeIcon` the one worn when selected; where
 * SF Symbols has no filled counterpart the same glyph is reused and the white
 * tint alone carries the selection.
 */
const TABS: { name: string; label: string; icon: SFSymbol; activeIcon: SFSymbol }[] = [
  { name: '(dashboard)', label: 'Dashboard', icon: 'house', activeIcon: 'house.fill' },
  { name: 'plan', label: 'Plan', icon: 'calendar', activeIcon: 'calendar' },
  { name: 'activities', label: 'Activities', icon: 'flame', activeIcon: 'flame.fill' },
  {
    name: 'trends',
    label: 'Trends',
    icon: 'chart.line.uptrend.xyaxis',
    activeIcon: 'chart.line.uptrend.xyaxis',
  },
];

/** Reachable from the header, but never drawn in the bar. */
const HIDDEN_TABS = ['profile'];

export default function AppTabs() {
  const { width } = useWindowDimensions();

  return (
    <Tabs
      tabBar={props => <AppTabBar {...props} />}
      /*
       * Keep every scene attached. With detaching on, the navigator decides a
       * screen's `activityState` by interpolating the very Animated.Value it is
       * driving on the native thread — so once a custom transition switches that
       * path on, react-native-screens reads a value JS never updates and leaves
       * the focused scene detached, which shows as a blank page under a correct
       * header and tab bar.
       */
      detachInactiveScreens={false}
      screenOptions={{
        /* Each tab owns a Stack with its own native header; a second header
           here would sit above it. */
        headerShown: false,
        transitionSpec: {
          animation: 'timing',
          config: { duration: 260, easing: Easing.out(Easing.cubic) },
        },
        /*
         * A short directional travel, crossfaded — the two screens overlap for
         * most of the transition and dissolve into one another.
         *
         * The distance is deliberately a quarter of the width, not a full one:
         * at full width the outgoing and incoming screens tile edge to edge and
         * never overlap, so fading them both just shows the page through each in
         * turn. `progress` runs -1 → 0 → 1, its sign taken from the tabs' order,
         * so direction is never computed here.
         */
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            opacity: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0, 1, 0],
            }),
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-width * TravelFraction, 0, width * TravelFraction],
                }),
              },
            ],
          },
        }),
      }}>
      {TABS.map(tab => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
      {/* Declared last so it sits after Trends: opening it from any tab wipes
          in from the right, and leaving it wipes back. */}
      {HIDDEN_TABS.map(name => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}

function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <GlassView
        glassEffectStyle="regular"
        /* The bare material sits far lighter than the design's bar; this tints
           it back down to the sampled fill while still letting content show
           through as it scrolls underneath. */
        tintColor="rgba(0, 0, 0, 0.35)"
        style={[
          styles.bar,
          !glassAvailable && { backgroundColor: theme.backgroundElement },
        ]}>
        {state.routes.map((route, index) => {
          // Compare the first segment: a tab with no layout of its own is
          // named "plan/index" rather than "plan".
          const tab = TABS.find(item => item.name === route.name.split('/')[0]);
          if (!tab) {
            return null;
          }

          const focused = state.index === index;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => {
                // `navigate` rather than a raw jump: it is what lets the
                // navigator resolve the direction from the tabs' order.
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.dispatch({ ...CommonActions.navigate(route), target: state.key });
                }
              }}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
              <SymbolView
                name={focused ? tab.activeIcon : tab.icon}
                size={Bar.iconSize}
                /* The design's strokes are thinner than SF's default weight. */
                weight="light"
                tintColor={focused ? IconTint.active : IconTint.inactive}
              />
            </Pressable>
          );
        })}
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    /* Floats over the content, the way the native bar did, so screens keep
       scrolling underneath it. */
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Bar.margin,
    paddingHorizontal: Bar.margin,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Bar.height,
    paddingHorizontal: Bar.padding,
    /* Far larger than the height, which gives a true capsule — the design's
       corner arc matches a radius of exactly half the height. */
    borderRadius: 999,
    overflow: 'hidden',
  },
  tab: {
    /* Equal shares, so the icons sit on the bar's own gridlines. */
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.5,
  },
});
