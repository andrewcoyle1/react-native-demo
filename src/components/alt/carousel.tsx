/**
 * The dashboard's plan carousel, rebuilt on gluestack-ui.
 *
 * The geometry is deliberately identical to `components/carousel.tsx` — same
 * page width, same 0.94 resting scale for a neighbour, same indicator sizes —
 * because the point of the pilot is to compare *construction*, and changing the
 * measurements at the same time would make the two incomparable. What differs
 * is what the pieces are made of: gluestack primitives and semantic tokens
 * instead of `ThemedView`, `useTheme()` and a `StyleSheet`.
 *
 * Reanimated still drives the motion, and unapologetically. gluestack has no
 * carousel, and the thing worth keeping from the standard build is that the
 * page scale and the indicators are interpolated from the same scroll value —
 * so both track the finger continuously rather than snapping when the scroll
 * settles. No component library replaces that.
 *
 * The animated views take `style` rather than `className`: they come from
 * `react-native-reanimated`, which the NativeWind resolver does not rewrite, so
 * a class name on them would silently do nothing. Everything static around them
 * is tokenised as usual.
 */
import { Children, useState, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { AddIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

import { Spacing } from '@/constants/theme';

/** Page inset from the screen edge. */
const SidePadding = Spacing.three;
/** How far back a page sits once it is a full page away from centre. */
const MinScale = 0.94;

const DotSize = Spacing.two;
const ActiveDotWidth = Spacing.four;

type AltCarouselProps = {
  /** One element per page. Each is stretched to a page's width and height. */
  children: ReactNode;
  /**
   * Fixed viewport height, in points. Without it the carousel is as tall as its
   * tallest page, so pages of differing length make the indicators jump. A
   * page's own content still needs `flex-1` to grow into the space rather than
   * sitting at the top.
   *
   * The default is measured against the tallest page this screen has — label
   * row, countdown, caption, the week line and the plan chart under it — with
   * enough slack that they are spaced rather than crammed, and not so much
   * that the middle opens into a dead gap.
   */
  height?: number;
  /**
   * A final page offering to create something new. Its indicator is a `+`
   * rather than a dot, and tapping that `+` scrolls to it — so the symbol and
   * the page it stands for are one affordance, not two.
   */
  addPage?: ReactNode;
  accessibilityLabel?: string;
};

export function AltCarousel({
  children,
  height = 272,
  addPage,
  accessibilityLabel,
}: AltCarouselProps) {
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
    <Box className="gap-3">
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        /* Snapping by interval rather than `pagingEnabled`: a page is narrower
           than the screen, so paging would settle a screen-width at a time and
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
        contentContainerStyle={{
          /* Centres the first and last pages: with a page inset this much
             either side, resting at a multiple of the interval leaves it
             centred. */
          paddingHorizontal: SidePadding,
          /* Scaled-down neighbours must not be clipped top and bottom. */
          alignItems: 'center',
        }}
        accessibilityLabel={accessibilityLabel}>
        {pages.map((child, index) => (
          <Page key={index} index={index} scrollX={scrollX} interval={interval}>
            {child}
          </Page>
        ))}
      </Animated.ScrollView>

      {pages.length > 1 ? (
        <HStack
          space="sm"
          className="items-center justify-center"
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
        </HStack>
      ) : null}
    </Box>
  );
}

type PageProps = {
  index: number;
  scrollX: SharedValue<number>;
  interval: number;
  children: ReactNode;
};

function Page({ index, scrollX, interval, children }: PageProps) {
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
    <Animated.View
      style={[
        {
          width: interval,
          height: '100%',
          /* The row stretches children on the cross axis, so a page already
             fills the carousel's height. This makes the page a column that can
             pass that height down to a child asking for `flex-1`. */
          flexDirection: 'column',
        },
        style,
      ]}>
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
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(scrollX.value / interval - index);
    return {
      // The current page reads as a pill rather than a larger dot, so the row's
      // height stays put as it widens.
      width: interpolate(distance, [0, 1], [ActiveDotWidth, DotSize], Extrapolation.CLAMP),
      opacity: interpolate(distance, [0, 1], [1, 0.35], Extrapolation.CLAMP),
    };
  });

  return (
    /* The dot's colour is a token, so it is the one part of this the animation
       does not own: `bg-foreground` on the inner view, geometry on the outer. */
    <Animated.View style={[{ height: DotSize, borderRadius: DotSize / 2 }, style]}>
      <Box className="h-full w-full rounded-full bg-foreground" />
    </Animated.View>
  );
}

function AddIndicator({
  index,
  scrollX,
  interval,
  onPress,
}: IndicatorProps & { onPress: () => void }) {
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
        <Icon as={AddIcon} size="xs" className="text-foreground" />
      </Animated.View>
    </Pressable>
  );
}
