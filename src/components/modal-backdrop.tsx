/**
 * The blurred ground every transparent modal sits on.
 *
 * Shared by the settings dialogs and the feedback sheet, because the way a
 * blur has to be brought in is subtle enough to be worth writing once.
 *
 * `GlassView` cannot be faded with opacity. From the Expo docs:
 *
 *   "Setting `opacity` to `0` on `GlassView` or any of its parent views causes
 *   the glass effect to not render at all. To fade in/out the glass effect, use
 *   the built-in `animate` and `animationDuration` props in `glassEffectStyle`
 *   instead of changing opacity."
 *
 * Apple says the same of the `UIVisualEffectView` underneath: an alpha below 1
 * on the effect view *or any superview* forces an offscreen render pass, and
 * many effects then "look incorrect or not show up at all". That is a rendering
 * rule, not a race, which is why the symptom was a backdrop that simply did not
 * blur — intermittently, depending on whether UIKit happened to re-sample once
 * the alpha landed back on 1.
 *
 * So the fade lives in the effect itself: mounted with no glass, switched to
 * `regular` a moment later, and UIKit cross-fades between the two. Callers fade
 * their *content* instead — that sits inside the effect view's `contentView`,
 * where an alpha is supported and expected.
 *
 * Where there is no glass to break — Android, and iOS before 26 — the backdrop
 * is a plain fill, and an ordinary opacity fade is both safe and necessary, or
 * those platforms would get a hard cut.
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { GlassColorScheme } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

/** Liquid glass is iOS 26+; elsewhere `GlassView` renders as a plain `View`. */
const glassAvailable = isLiquidGlassAvailable();

/** Seconds, unlike Reanimated's milliseconds — this one is handed to UIKit. */
const FadeInSeconds = 0.16;

/**
 * How long after layout to switch the glass on.
 *
 * The switch has to land after the native view's first `layoutSubviews`, and
 * `onLayout` alone is too early — see `GlassBackdrop`. There is no JS-visible
 * signal for that pass, so this is a delay rather than an event. Short enough
 * to read as part of the same movement, and long enough to clear the layout on
 * everything measured. Too short only costs the fade, never the blur.
 */
const FlipDelayMs = 50;

type ModalBackdropProps = {
  /** Tints the glass. */
  tintColor?: ColorValue;
  /** The fill standing in for the blur where there is none. Near-opaque: with
      nothing blurred behind it, the page underneath would otherwise stay
      legible enough to tangle with the dialog's own text. */
  fallbackColor: ColorValue;
  /** Pins the material's appearance where the content on it is not themed. */
  colorScheme?: GlassColorScheme;
  children: ReactNode;
};

export function ModalBackdrop({
  tintColor,
  fallbackColor,
  colorScheme,
  children,
}: ModalBackdropProps) {
  if (!glassAvailable) {
    return (
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(120)}
        style={[styles.fill, { backgroundColor: fallbackColor }]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <GlassBackdrop tintColor={tintColor} colorScheme={colorScheme}>
      {children}
    </GlassBackdrop>
  );
}

/**
 * Split out so the state below only exists on the path that uses it — the
 * branch above turns on a module constant, so neither component ever swaps for
 * the other and no hook ordering is at stake.
 */
function GlassBackdrop({
  tintColor,
  colorScheme,
  children,
}: Omit<ModalBackdropProps, 'fallbackColor'>) {
  /*
   * Mounted with no glass, switched to `regular` shortly after layout, so UIKit
   * has two distinct styles to cross-fade between.
   *
   * The timing is the fiddly part, and it is why this hangs off `onLayout` plus
   * a delay rather than an effect. `GlassView.swift` ignores every effect change
   * until its first `layoutSubviews` — an `isMounted` flag, from expo#41024 and
   * expo#43732 — and then applies the pending one from inside that layout pass,
   * outside any animation block. Flip the style before that pass and it is
   * swallowed and the blur snaps in; flip it after and the change runs through
   * the animated path. `onLayout` fires when Fabric applies layout metrics,
   * which is ahead of the UIKit pass, so on its own it is still too early:
   * measured, `onLayout` and one further frame both snapped, and 50ms animated.
   *
   * The flip earns itself a second time over: `applyGlassStyle` returns early
   * when the style has not changed, so a view Fabric recycled into this modal
   * could otherwise come up holding a stale effect. A style that genuinely
   * changes after layout forces a fresh `UIGlassEffect` on every present.
   */
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function armGlass() {
    // `onLayout` fires again on rotation and when the keyboard resizes the
    // dialog; the glass is already on by then and there is nothing to redo.
    if (shown || timer.current !== undefined) {
      return;
    }
    timer.current = setTimeout(() => setShown(true), FlipDelayMs);
  }

  return (
    <GlassView
      glassEffectStyle={{
        style: shown ? 'regular' : 'none',
        animate: true,
        animationDuration: FadeInSeconds,
      }}
      tintColor={tintColor}
      colorScheme={colorScheme}
      onLayout={armGlass}
      style={styles.fill}>
      {children}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
