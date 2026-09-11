import Constants from 'expo-constants';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image, type ImageProps } from 'expo-image';
import { router } from 'expo-router';
import { Icon } from '@/components/icon';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accents, Fonts, Spacing, Zones } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';

/**
 * Release notes, presented as a form sheet from the header's bell.
 *
 * Laid out to the design: an oversized title over a monospaced version line,
 * then one entry per feature — a symbol in the gutter, the heading beside it,
 * and the prose indented to the heading's own left edge.
 */

/** Liquid glass is iOS 26+; elsewhere the footer needs a solid fill to read. */
const glassAvailable = isLiquidGlassAvailable();

/** The dotted ground the design lays behind the sheet's content. */
const DotTexture =
  'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.055) 0px, rgba(255, 255, 255, 0.055) 1px, transparent 1.6px)';

type ReleaseNote = {
  title: string;
  icon: SFSymbol;
  accent: string;
  paragraphs: string[];
  /** Optional artwork under the prose — a screenshot of the feature. */
  artwork?: ImageProps['source'];
};

/** Placeholder copy until the release-notes service lands. */
const RELEASE = {
  date: 'August 25, 2026',
  notes: [
    {
      title: 'B/C races',
      icon: 'flag',
      accent: Accents.speed,
      paragraphs: [
        "Our most requested feature by far, and it's finally here! You can now schedule B and C races in the build-up to your main race, including running races all the way up to the marathon.",
        'Your plan adjusts automatically, preparing you for each race and giving you time to recover after, before getting you back on track towards the big one.',
      ],
      /* Remote test photo, to prove the wiring. Swap for the real screenshot. */
      artwork: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800',
    },
    {
      title: 'Run Threshold & VO2 Max',
      icon: 'figure.run',
      accent: Zones.hard,
      paragraphs: [
        'Your run threshold pace and VO2 max are now estimated from every run you record, and feed straight into the paces your plan asks for.',
      ],
    },
  ] satisfies ReleaseNote[],
};

export default function SheetScreen() {
  useScreenTracking('Release notes');

  const theme = useTheme();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      {/* The texture is its own layer rather than a background on the scroll
          view, so it stays put while the content moves over it. */}
      <View style={styles.texture} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.title}>What&apos;s new in Stamina</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.version}>
          Version {version} · {RELEASE.date}
        </ThemedText>

        <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

        {RELEASE.notes.map(note => (
          <View key={note.title} style={styles.note}>
            <Icon name={note.icon} size={20} tintColor={note.accent} style={styles.noteIcon} />

            <View style={styles.noteBody}>
              <ThemedText style={styles.noteTitle}>{note.title}</ThemedText>

              {note.paragraphs.map(paragraph => (
                <ThemedText key={paragraph} themeColor="textSecondary" style={styles.paragraph}>
                  {paragraph}
                </ThemedText>
              ))}

              {note.artwork ? (
                <Image
                  source={note.artwork}
                  style={[styles.artwork, { borderColor: theme.backgroundSelected }]}
                  contentFit="cover"
                  /* Decorative: the prose above already carries the meaning. */
                  accessible={false}
                />
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pinned, with the content scrolling underneath it. */}
      <View style={styles.footer}>
        <GlassView
          glassEffectStyle="regular"
          style={[styles.button, !glassAvailable && { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            style={({ pressed }) => [styles.buttonInner, pressed && styles.pressed]}>
            <ThemedText style={styles.buttonLabel}>Continue</ThemedText>
          </Pressable>
        </GlassView>
      </View>
    </View>
  );
}

/** Page gutter inside the sheet, and the width of the symbol column. */
const Gutter = 24;
const IconColumn = 31;
const FooterHeight = 52;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  texture: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    experimental_backgroundImage: DotTexture,
    experimental_backgroundSize: '16px 16px',
    experimental_backgroundRepeat: 'repeat',
  },
  content: {
    paddingHorizontal: Gutter,
    paddingTop: Spacing.five,
    /* Clears the pinned footer so the last line is reachable. */
    paddingBottom: FooterHeight + Spacing.six,
  },
  title: {
    fontSize: 36,
    /* Set explicitly: ThemedText's default preset carries a 24pt line height,
       which would clip a title this size. */
    lineHeight: 43,
    fontWeight: 600,
    /* Display type wants tighter tracking than the system default gives it. */
    letterSpacing: -1,
  },
  version: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.two,
  },
  divider: {
    height: 1,
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
  },
  note: {
    flexDirection: 'row',
    marginBottom: Spacing.five,
  },
  noteIcon: {
    width: IconColumn,
    /* Nudges the glyph onto the heading's optical baseline. */
    marginTop: 2,
  },
  noteBody: {
    /* Lets the prose wrap inside the column rather than push the symbol out. */
    flex: 1,
    gap: Spacing.three,
  },
  noteTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 21,
  },
  artwork: {
    height: 420,
    marginTop: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  footer: {
    position: 'absolute',
    left: Gutter,
    right: Gutter,
    bottom: Spacing.four,
  },
  button: {
    height: FooterHeight,
    borderRadius: 999,
    overflow: 'hidden',
  },
  buttonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 19,
  },
  pressed: {
    opacity: 0.6,
  },
});
