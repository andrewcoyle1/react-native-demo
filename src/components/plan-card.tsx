//
//  plan-card.tsx
//  
//
//  Created by Andrew Coyle on 08/09/2026.
//

import type { ReactNode } from 'react';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image, type ImageProps } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PlanChart } from './plan-chart';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { PlanAccent, Spacing } from '@/constants/theme';

/**
 * Liquid glass is iOS 26+. Everywhere else `GlassView` renders as a plain View,
 * so the capsule needs a solid fallback or it would vanish against the photo.
 */
const glassAvailable = isLiquidGlassAvailable();

type PlanCardProps = {
  title1?: string;
  title2?: string;
  title3?: string;
  title4?: string;
  /**
   * Optional artwork behind the card's content. Takes anything expo-image's
   * `source` takes: `require('…/x.png')` for a bundled asset, a remote URL
   * string, or `{ uri }`. Omit it and the card keeps its themed background.
   */
  backgroundImage?: ImageProps['source'];
  /** One value per week. Renders a chart across the foot of the card. */
  bars?: number[];
  /** The week in progress, drawn as a dashed target. */
  currentBarIndex?: number;
  /** How much of the current week is complete, 0-1. */
  currentBarProgress?: number;
  /** Tallest bar's height in points. */
  chartHeight?: number;
  /** Adds the overflow button in the card's top-right corner. */
  onMenuPress?: () => void;
  children?: ReactNode;
  /** Layout overrides for the card box itself — height, flex, margins. */
  style?: StyleProp<ViewStyle>;
};

/** Grouped block of related controls or values. */
export function PlanCard({
  title1,
  title2,
  title3,
  title4,
  backgroundImage,
  bars,
  currentBarIndex,
  currentBarProgress,
  chartHeight = 70,
  onMenuPress,
  children,
  style,
}: PlanCardProps) {
  // With artwork behind it the card is no longer on a themed surface, so the
  // theme's text tokens (black in light mode) stop working. Light text is
  // conditional rather than hardcoded so a card with no image still reads.
  const onImage = !!backgroundImage;
  const hasChart = !!bars && bars.length > 0;

  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {/* Absolutely positioned so it fills the card without taking part in the
          column layout — the titles below it lay out as if it were not there.
          `overflow: 'hidden'` on the card is what clips it to the corner radius.
          It comes first in source order so everything else paints on top. */}
      {backgroundImage ? (
        <>
          <Image
            source={backgroundImage}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            /* Decorative: hidden from screen readers, since the titles already
               carry the meaning. */
            accessible={false}
          />
          {/* Scrim. Arbitrary artwork will not reliably contrast with the text,
              so this darkens it slightly. Drop it if your images are already
              dark enough. */}
          <ThemedView style={styles.scrim} />
        </>
      ) : null}
      {/* Absolutely positioned so it sits in the corner without taking a slot in
          the column — the titles lay out as if it were not there. */}
      {onMenuPress ? (
        <Pressable
          onPress={onMenuPress}
          accessibilityRole="button"
          accessibilityLabel="Plan options"
          hitSlop={Spacing.two}
          style={({ pressed }) => [styles.menu, pressed && styles.menuPressed]}>
          <GlassView
            glassEffectStyle="regular"
            colorScheme="dark"
            tintColor="rgba(0, 0, 0, 0.45)"
            style={[styles.menuGlass, !glassAvailable && styles.capsuleFallback]}>
            <SymbolView name="ellipsis" size={18} tintColor="#FFFFFF" />
          </GlassView>
        </Pressable>
      ) : null}

      {/* Each title is written out rather than mapped, so it can carry its own
          size and weight. Each guards itself: a title that was not passed
          renders nothing instead of an empty line. */}

      {/* Grouping title1-3 gives them their own, tighter rhythm. The card's
          `gap` then applies between this whole block and title4, rather than
          between every individual line. */}
      <View style={styles.heading}>
        {title1 ? (
          /* `alignSelf: 'flex-start'` is what makes the capsule hug its text —
             without it the column stretches it to the card's full width. */
          <GlassView
            glassEffectStyle="regular"
            /* The glass takes its brightness from the system appearance, which
               is light here — over a photo that washes out the white text.
               Pinning it dark and tinting it keeps the label readable. */
            colorScheme="dark"
            tintColor="rgba(0, 0, 0, 0.45)"
            style={[styles.capsule, !glassAvailable && styles.capsuleFallback]}>
            {/* Two concentric filled circles: a translucent halo with a solid
                core centred in it. The inner one is a child rather than a
                sibling so the parent's centring does the alignment. */}
            <View style={styles.statusHalo}>
              <View style={styles.statusCore} />
            </View>

            <ThemedText style={[styles.title1, onImage && styles.textOnImage]}>
              {title1.toUpperCase()}
            </ThemedText>
          </GlassView>
        ) : null}

        {/* A plain View, not ThemedView: ThemedView with no `type` paints the
            `background` token, which was covering the artwork with a white box. */}
        <View style={styles.row}>
          {/* Not uppercased, unlike the labels around it: this is the card's
              headline number, and "305 DAYS" shouts where "305 days" reads. */}
          {title2 ? (
            <ThemedText style={[styles.title2, onImage && styles.textOnImage]}>
              {title2}
            </ThemedText>
          ) : null}
          {title3 ? (
            <ThemedText style={[styles.title3, onImage && styles.textOnImage]}>
              {title3}
            </ThemedText>
          ) : null}
        </View>
        {title4 ? (
          <ThemedText
            themeColor="textSecondary"
            style={[styles.title4, onImage && styles.textOnImageSecondary]}>
            {title4.toUpperCase()}
          </ThemedText>
        ) : null}
      </View>


      {/* Absolutely positioned, so it overlays the artwork at the card's foot
          without pushing the titles around or competing for the column's space.
          Negative insets cancel the card's padding, letting the bars run to the
          edges the way the design does. */}
      {hasChart ? (
        <PlanChart
          bars={bars}
          currentIndex={currentBarIndex}
          currentProgress={currentBarProgress}
          height={chartHeight}
          style={styles.chart}
        />
      ) : null}

      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    /* Tighter on the sides than top and bottom: 24pt of leading padding pushed
       the titles too far in on a card this narrow. */
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
    /* Clips the background image to the rounded corners. */
    overflow: 'hidden',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  /* Fixed light values, not theme tokens: the surface here is the photo, which
     does not change with the theme, so neither should the text on it. */
  textOnImage: {
    color: '#FFFFFF',
  },
  textOnImageSecondary: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  chart: {
    position: 'absolute',
    /* Absolute offsets are measured from the padding box, so `bottom: 0` would
       sit flush on the card's bottom edge, ignoring its padding. This lifts the
       bars clear of it. */
    bottom: Spacing.three,
    /* Same reason as `bottom`: offsets come off the padding box, so these are
       measured from the card's outer edges, not from inside its padding. Equal
       on all three sides so the chart is inset consistently. */
    left: Spacing.three,
    right: Spacing.three,
  },
  capsule: {
    alignSelf: 'flex-start',
    /* Cancels the capsule's own leading padding so title1's text lines up with
       the titles beneath it, rather than sitting a pill's-worth further in. */
    marginLeft: -Spacing.two,
    /* Row so the status dot sits beside the label rather than above it. */
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 0,
    /* A number far larger than the height gives a true capsule, whatever the
       text's line height turns out to be. */
    borderRadius: 999,
    overflow: 'hidden',
  },
  statusHalo: {
    width: 12,
    height: 12,
    /* Half the width is what makes a square a circle. */
    borderRadius: 9,
    backgroundColor: 'rgba(155, 232, 127, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCore: {
    width: 6,
    height: 6,
    borderRadius: 4.5,
    backgroundColor: PlanAccent,
  },
  capsuleFallback: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  menu: {
    position: 'absolute',
    /* Measured from the card's outer edge, not its padding box, so this insets
       the button from the artwork rather than from the text column. */
    top: Spacing.three,
    right: Spacing.three,
    /* Above the artwork and the scrim, both of which paint earlier. */
    zIndex: 1,
  },
  menuPressed: {
    opacity: 0.6,
  },
  menuGlass: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heading: {
    /* Tighter than the card's own gap, so these lines read as one block. */
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    /* 'baseline' rather than 'center': the two titles are different sizes, so
       this sits their text on a shared line instead of centring the boxes. */
    alignItems: 'baseline',
    /* Packed to the left and spaced by `gap`. 'space-between' would have shoved
       them to opposite edges, which is why they looked so far apart. */
    justifyContent: 'flex-start',
    gap: Spacing.two,
  },
  /* One entry per title so their sizes can diverge. They start identical —
     give each its own fontSize/fontWeight as the design settles. */
  title1: {
    fontSize: 12
  },
  title2: {
    fontSize: 26,
    fontWeight: 700,
  },
  title3: {
    fontSize: 14,
    /* Lets the subtitle give way to the headline number beside it rather than
       running off the card's edge. */
    flexShrink: 1,
  },
  title4: {
    fontSize: 12
  },
});
