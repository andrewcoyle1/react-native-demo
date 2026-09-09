import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';

const SLIDES = [
  {
    key: 'welcome',
    title: 'Welcome',
    body: 'A small Expo app wired up to Firebase — auth, Firestore, Analytics and Crashlytics, all behind swappable services.',
  },
  {
    key: 'notes',
    title: 'Notes that sync',
    body: 'Everything you write is stored under your own user in Cloud Firestore, and a live listener keeps the list current without a refresh.',
  },
  {
    key: 'environments',
    title: 'Three environments',
    body: 'Run against real Firebase in dev and prod, or against in-memory fakes in mock — no network, no account, same app.',
  },
];

export default function IntroScreen() {
  useScreenTracking('Intro');

  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  // Measured rather than taken from Dimensions so rotation and tablets behave.
  const [width, setWidth] = useState(windowWidth);
  const [page, setPage] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  const isLastPage = page === SLIDES.length - 1;

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width > 0) {
      setPage(Math.round(event.nativeEvent.contentOffset.x / width));
    }
  }

  return (
    <ThemedView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      onLayout={handleLayout}>
      <ThemedView style={styles.skipRow}>
        <Pressable
          accessibilityRole="button"
          hitSlop={Spacing.three}
          onPress={() => router.push('/sign-in')}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Skip
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        ref={pagerRef}
        style={styles.pager}>
        {SLIDES.map(slide => (
          <ThemedView key={slide.key} style={[styles.slide, { width }]}>
            <ThemedText type="title" style={styles.slideTitle}>
              {slide.title}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.slideBody}>
              {slide.body}
            </ThemedText>
          </ThemedView>
        ))}
      </ScrollView>

      <ThemedView style={styles.footer}>
        <ThemedView
          style={styles.dots}
          accessibilityRole="progressbar"
          accessibilityLabel={`Page ${page + 1} of ${SLIDES.length}`}>
          {SLIDES.map((slide, index) => (
            <ThemedView
              key={slide.key}
              style={[
                styles.dot,
                {
                  backgroundColor: index === page ? theme.text : theme.backgroundSelected,
                },
              ]}
            />
          ))}
        </ThemedView>

        <ActionButton
          title={isLastPage ? 'Get started' : 'Next'}
          onPress={() => {
            if (isLastPage) {
              router.push('/sign-in');
              return;
            }
            // Drive the pager; `page` updates from onMomentumScrollEnd so the
            // dots stay in step whether you tap Next or swipe.
            pagerRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
          }}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  slideTitle: {
    textAlign: 'center',
  },
  slideBody: {
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: Spacing.two,
    height: Spacing.two,
    borderRadius: Spacing.one,
  },
});
