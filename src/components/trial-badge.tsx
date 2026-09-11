/**
 * The "Free trial" capsule beside the screen name.
 *
 * An outlined pill, not a filled one: the design draws a 1pt gradient stroke
 * with the same gradient behind it at about a third strength. Built as a
 * gradient-filled box with 1pt of padding wrapping a second, dimmer one — a
 * plain `borderColor` cannot take a gradient.
 *
 * `experimental_backgroundImage` is React Native's CSS-gradient syntax, which
 * keeps this in the existing bundle: expo-linear-gradient is a native module
 * and would need a rebuild of the dev client to add.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Fonts } from '@/constants/theme';

/** Sampled across the design's stroke: pink, through violet, to blue. */
const Stroke = 'linear-gradient(90deg, #E28CB4 0%, #817CE3 50%, #3472E4 100%)';

/**
 * The fill, sampled straight from the design.
 *
 * Opaque rather than the stroke ramp at 35%: the inner box sits on top of the
 * stroke, so a translucent fill would composite over that bright gradient
 * instead of over the page and the whole capsule would read as solid.
 */
const Fill = 'linear-gradient(90deg, #5B3A42 0%, #352D55 50%, #112A54 100%)';

type TrialBadgeProps = {
  label?: string;
};

export function TrialBadge({ label = 'Free trial' }: TrialBadgeProps) {
  return (
    <View style={styles.stroke}>
      <View style={styles.fill}>
        <ThemedText style={styles.label}>{label}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stroke: {
    alignSelf: 'center',
    /* The 1pt that shows around the inner box is the stroke. */
    padding: 1,
    borderRadius: 999,
    experimental_backgroundImage: Stroke,
  },
  fill: {
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 999,
    experimental_backgroundImage: Fill,
  },
  /* Monospaced, as the design has it, and fixed white rather than a theme
     token: the surface under it is the gradient, not a themed one. */
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.mono,
    fontSize: 12,
    /* Set explicitly, and to the inner height: ThemedText's default preset
       carries a 24pt line height, and that oversized line box inside a 20pt
       capsule pushes the glyphs below centre. */
    lineHeight: 20,
  },
});
