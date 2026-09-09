/**
 * Full-bleed horizontal carousel: the pages run to the screen edges, the
 * neighbours peek in either side, and whichever page is centred is drawn at
 * full size while the rest sit slightly back.
 *
 * Geometry is measured off the design: a page is the screen less 16pt either
 * side, and pages are laid out edge to edge. The 12pt that appears between them
 * is not a gap — it is the inset left by scaling an off-centre page to 94%,
 * which is also what leaves the neighbour peeking ~4pt in from the screen edge
 * at rest. Adding a real gap on top would double that and push the peek off.
 *
 * The scroll position drives the page scale and the indicators from the same
 * shared value, so both track the finger continuously rather than snapping when
 * the scroll settles.
 */
import { Children, useState, type ReactNode } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Page inset from the screen edge. */
const SidePadding = Spacing.three;
/** How far back a page sits once it is a full page away from centre. */
const MinScale = 0.94;

const DotSize = Spacing.two;
const ActiveDotWidth = Spacing.four;

type CarouselProps = {
  /** One element per page. Each is stretched to a page's width. */
  children: ReactNode;
  /**
   * Fixed viewport height, in points. Without it the carousel is as tall as its
   * tallest page, so pages of differing length make the indicators jump.
   * Pages stretch to fill this, but a page's own content still needs `flex: 1`
   * to grow into the space rather than sitting at the top.
   */
  height?: number;
  /**
   * A final page offering to create something new. Its indicator is a `+`
   * rather than a dot, and tapping that `+` scrolls to it — so the symbol and
   * the page it stands for are the same thing, not two separate affordances.
   */
  addPage?: ReactNode;
  accessibilityLabel?: string;
};

export function Carousel({ children, height = 272, addPage, accessibilityLabel }: CarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);

  const pages = [...Children.toArray(children), ...(addPage ? [addPage] : [])];
  const addIndex = addPage ? pages.length - 1 : -1;

  // Pages are adjacent, so a page's width is also the distance the scroll
  // travels between rests, and the unit every interpolation below is in.
  const interval = windowWidth - SidePadding * 2;

  const handleScroll = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x;
  });

  function goTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * interval, animated: true });
  }

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        /* Snapping by interval rather than `pagingEnabled`: a page is narrower
           than the screen, so paging would settle a page-width at a time and
           drift out of alignment. */
        snapToInterval={interval}
        decelerationRate="fast"
        /* Without this a fast flick can carry past several pages at once. */
        disableIntervalMomentum
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={event =>
          setPage(Math.round(event.nativeEvent.contentOffset.x / interval))
        }
        style={{ height }}
        contentContainerStyle={styles.content}
        accessibilityLabel={accessibilityLabel}>
        {pages.map((child, index) => (
          <Page
            key={index}
            index={index}
            scrollX={scrollX}
            interval={interval}
            width={interval}>
            {child}
          </Page>
        ))}
      </Animated.ScrollView>

      {pages.length > 1 ? (
        <ThemedView
          style={styles.indicators}
          accessibilityRole="progressbar"
          accessibilityLabel={`Page ${page + 1} of ${pages.length}`}>
          {pages.map((_, index) =>
            index === addIndex ? (
              <AddIndicator
                key="add"
                index={index}
                scrollX={scrollX}
                interval={interval}
                onPress={() => goTo(index)}
              />
            ) : (
              <Dot key={index} index={index} scrollX={scrollX} interval={interval} />
            ),
          )}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

type PageProps = {
  index: number;
  scrollX: SharedValue<number>;
  interval: number;
  width: number;
  children: ReactNode;
};

function Page({ index, scrollX, interval, width, children }: PageProps) {
  const style = useAnimatedStyle(() => {
    // Pages away from centre, as a fraction: 0 centred, 1 a full page out.
    const distance = Math.abs(scrollX.value / interval - index);
    return {
      transform: [
        { scale: interpolate(distance, [0, 1], [1, MinScale], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.page, { width }, style]}>
      {children}
    </Animated.View>
  );
}

type IndicatorProps = {
  index: number;
  scrollX: SharedValue<number>;
  interval: number;
};

function Dot({ index, scrollX, interval }: IndicatorProps) {
  const theme = useTheme();

  const style = useAnimatedStyle(() => {
    const distance = Math.abs(scrollX.value / interval - index);
    return {
      // The current page reads as a pill rather than a larger dot, so the row's
      // height stays put as it widens.
      width: interpolate(distance, [0, 1], [ActiveDotWidth, DotSize], Extrapolation.CLAMP),
      opacity: interpolate(distance, [0, 1], [1, 0.35], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[styles.dot, { backgroundColor: theme.text }, style]} />;
}

function AddIndicator({
  index,
  scrollX,
  interval,
  onPress,
}: IndicatorProps & { onPress: () => void }) {
  const theme = useTheme();

  const style = useAnimatedStyle(() => {
    const distance = Math.abs(scrollX.value / interval - index);
    return {
      opacity: interpolate(distance, [0, 1], [1, 0.45], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(distance, [0, 1], [1.2, 1], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Create a new plan"
      hitSlop={Spacing.two}>
      <Animated.View style={style}>
        <SymbolView name="plus" size={14} tintColor={theme.text} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  content: {
    /* Centres the first and last pages: with a page inset this much either
       side, resting at a multiple of the interval leaves it centred. */
    paddingHorizontal: SidePadding,
    /* Scaled-down neighbours must not be clipped at the top and bottom. */
    alignItems: 'center',
  },
  page: {
    height: '100%',
    /* The row stretches children on the cross axis, so a page already fills the
       carousel's height. This makes the page a column that can pass that height
       down to a child that asks for `flex: 1`. */
    flexDirection: 'column',
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    height: DotSize,
    borderRadius: DotSize / 2,
  },
});
