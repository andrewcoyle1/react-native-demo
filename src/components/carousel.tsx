import { Children, useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CarouselProps = {
  /** One element per page. Each is stretched to the carousel's measured width. */
  children: ReactNode;
  /**
   * Fixed viewport height, in points. Without it the carousel is as tall as its
   * tallest page, so pages of differing length make the dots jump as you swipe.
   * Pages stretch to fill this, but a page's own content still needs `flex: 1`
   * to grow into the space rather than sitting at the top.
   */
  height?: number;
  /** Hide the page dots when a single page, or an external control, is enough. */
  showDots?: boolean;
  accessibilityLabel?: string;
};

/**
 * Horizontally paged container with page dots.
 *
 * Width is measured with `onLayout` rather than read from `Dimensions`, so it is
 * correct inside padded containers and after rotation.
 */
export function Carousel({ children, height, showDots = true, accessibilityLabel }: CarouselProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  const pages = Children.toArray(children);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width > 0) {
      setPage(Math.round(event.nativeEvent.contentOffset.x / width));
    }
  }

  return (
    <ThemedView style={styles.container} onLayout={handleLayout}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        /* `style` sizes the viewport itself. Putting the height on
           contentContainerStyle instead would size the scrolling row, not the
           window onto it, and the carousel would not clip. */
        style={height === undefined ? undefined : { height }}
        accessibilityLabel={accessibilityLabel}>
        {/* Width is 0 on the first render, before onLayout reports. Rendering the
            pages at 0 width would collapse them, so hold until it is known. */}
        {width > 0
          ? pages.map((child, index) => (
              <View key={index} style={[styles.page, { width }]}>
                {child}
              </View>
            ))
          : null}
      </ScrollView>

      {showDots && pages.length > 1 ? (
        <ThemedView
          style={styles.dots}
          accessibilityRole="progressbar"
          accessibilityLabel={`Page ${page + 1} of ${pages.length}`}>
          {pages.map((_, index) => (
            <ThemedView
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === page ? theme.text : theme.backgroundSelected },
              ]}
            />
          ))}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  page: {
    /* The row stretches children on the cross axis, so a page already fills the
       carousel's height. This makes the page a column that can pass that height
       down to a child that asks for `flex: 1`. */
    flexDirection: 'column',
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
