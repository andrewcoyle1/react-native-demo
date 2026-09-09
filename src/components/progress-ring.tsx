/**
 * Circular progress arc, drawn without a drawing library.
 *
 * A View with `borderRadius` paints each of its four borders as a 90° arc, so
 * colouring the top and right ones gives a half-ring spanning [-45°, 135°].
 * Rotating that half-ring and clipping it to one half of the box yields any arc
 * from 0° to 360°: the first clip covers the first 180°, the second the rest.
 *
 * Four views per ring, which is what makes it cheap enough to put three of them
 * on a card. The alternative — one small view per degree — is smooth but costs
 * hundreds of views.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type ProgressRingProps = {
  /** 0-1. Values outside are clamped rather than wrapping past 12 o'clock. */
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  /** The unfilled remainder. Defaults to a dim version of the colour. */
  trackColor?: string;
  /** Centred inside the ring — usually the discipline symbol. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Unrotated, the top+right borders colour the arc from -45° to 135°, measuring
 * clockwise from 12 o'clock. Rotating by `(clipStart + angle) - ArcEnd` lands
 * the arc's END on the target angle and pushes its start out of the clip, which
 * is what leaves exactly the wanted sweep visible.
 */
const ArcEnd = 135;

export function ProgressRing({
  progress,
  size = 84,
  stroke = 8,
  color,
  trackColor,
  children,
  style,
}: ProgressRingProps) {
  const angle = Math.max(0, Math.min(1, progress)) * 360;
  const firstAngle = Math.min(angle, 180);
  const secondAngle = Math.max(0, angle - 180);

  const ring = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: stroke,
  } as const;

  const half = {
    ...ring,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    borderTopColor: color,
    borderRightColor: color,
  } as const;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          ring,
          styles.absolute,
          { borderColor: trackColor ?? `${color}33` },
        ]}
      />

      {/* Right half: carries the arc's first 180°. */}
      <View style={[styles.clip, { left: size / 2, width: size / 2, height: size }]}>
        <View
          style={[
            half,
            styles.absolute,
            {
              left: -size / 2,
              transform: [{ rotate: `${firstAngle - ArcEnd}deg` }],
            },
          ]}
        />
      </View>

      {/* Left half: only reached once the arc passes 6 o'clock. */}
      <View style={[styles.clip, { left: 0, width: size / 2, height: size }]}>
        <View
          style={[
            half,
            styles.absolute,
            { transform: [{ rotate: `${180 + secondAngle - ArcEnd}deg` }] },
          ]}
        />
      </View>

      {children ? <View style={[styles.absolute, styles.centre]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  clip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  centre: {
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
