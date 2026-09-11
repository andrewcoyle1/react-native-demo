/**
 * The first screen anyone sees.
 *
 * A photograph behind everything, dimmed towards the foot so the type and the
 * buttons keep their contrast wherever the image happens to be bright, with the
 * same dot screen the release-notes sheet uses laid over it.
 *
 * Geometry measured from the design at 440pt: a 16pt page gutter, the mark
 * 100 x 114pt centred, the title at 30pt over two lines.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/auth-button';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';

/**
 * The dot screen, tiled. A repeating radial gradient rather than an asset, so
 * it costs nothing to ship and stays crisp at any density.
 */
const DotTexture =
  'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.06) 0px, rgba(255, 255, 255, 0.06) 1px, transparent 1.6px)';

/** Measured off the design: the dots sit on a 12pt pitch. */
const DotPitch = 12;

/** The page gutter the Log in button is set to, narrower than the forms' 20. */
const Gutter = 16;

/**
 * Settles the photograph behind the type.
 *
 * The design's image is very nearly greyscale — measured at a saturation spread
 * of 5 against 14 for an untouched photograph — and dark throughout. Both come
 * from holding the image at low opacity over the near-black page rather than
 * from a filter: it desaturates and darkens in one move, and costs nothing.
 *
 * The gradient then does the last of the work at the foot, where the buttons
 * need to stay legible whatever frame happens to be behind them.
 */
const IMAGE_OPACITY = 0.34;

/**
 * The design's photograph is thrown well out of focus — no edge in it survives
 * — so the type has an even ground to sit on wherever the frame lands.
 */
const IMAGE_BLUR = 28;

const Scrim =
  'linear-gradient(180deg, rgba(16,16,16,0.25) 0%, rgba(16,16,16,0.1) 40%, rgba(16,16,16,0.45) 78%, rgba(16,16,16,0.8) 100%)';

/**
 * The type sits on a photograph over a near-black page, so it is light in
 * either colour scheme — `theme.text` would turn it black under a light system
 * setting and lose it against the image.
 */
const OnPhoto = {
  title: '#FFFFFF',
  /* Measured off the design's subtitle and footer, both the same tone. */
  subtitle: '#D6D6D6',
} as const;

/** Remote placeholder. Swap for the real artwork when it lands. */
const BACKGROUND = 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200';

export default function WelcomeScreen() {
  useScreenTracking('Welcome');

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <Image
        source={BACKGROUND}
        style={[StyleSheet.absoluteFill, { opacity: IMAGE_OPACITY }]}
        contentFit="cover"
        blurRadius={IMAGE_BLUR}
        transition={400}
      />
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      <View style={[StyleSheet.absoluteFill, styles.texture]} />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 15 },
        ]}>
        {/*
          * The three voids are flex weights rather than fixed heights, solved
          * against the design at 440x956 so the mark, the title and the footer
          * each land on their measured band. Proportions hold on a shorter
          * phone; fixed heights would push the footer off the bottom.
          */}
        <View style={{ flex: 214 }} />

        <View style={styles.mark}>
          {/* Redrawn from the polygon measured off the design: two slabs in a
              100 x 114pt box, the lower one the upper turned through 180. */}
          <Image
            source={require('../../../assets/images/stamina-mark.png')}
            style={styles.markImage}
            contentFit="contain"
          />
        </View>

        <View style={{ flex: 136 }} />

        <ThemedText style={styles.title}>Welcome to{'\n'}Stamina</ThemedText>
        <ThemedText style={styles.subtitle}>
          Your personalised triathlon{'\n'}training plan
        </ThemedText>

        <View style={{ flex: 152 }} />

        <View style={styles.actions}>
          <AuthButton title="Log in" variant="glass" onPress={() => router.push('/sign-in')} />

          <Pressable
            onPress={() => router.push('/sign-up')}
            accessibilityRole="button"
            accessibilityLabel="Sign up"
            hitSlop={12}
            style={({ pressed }) => [styles.footer, pressed && styles.pressed]}>
            <ThemedText style={styles.footerText}>
              Don&apos;t have an account?{' '}
            </ThemedText>
            <ThemedText style={styles.footerAction}>Sign up</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#101010',
  },
  scrim: {
    experimental_backgroundImage: Scrim,
  },
  texture: {
    experimental_backgroundImage: DotTexture,
    experimental_backgroundSize: `${DotPitch}px ${DotPitch}px`,
    experimental_backgroundRepeat: 'repeat',
  },
  content: {
    flex: 1,
    paddingHorizontal: Gutter,
  },
  mark: {
    height: 114,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markImage: {
    width: 100,
    height: 114,
  },
  title: {
    color: OnPhoto.title,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    /* 20 rather than the 32 measured between ink: the two line boxes carry
       about 12pt of leading between them already. */
    marginTop: 20,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: OnPhoto.subtitle,
  },
  actions: {
    gap: 35,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: OnPhoto.subtitle,
    fontSize: 15,
    lineHeight: 20,
  },
  footerAction: {
    color: OnPhoto.title,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
