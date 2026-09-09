/**
 * Vertical padding for a screen's scrolling content.
 *
 * Shared by `Screen` and `SectionScreen` so the two shells stay in step: a
 * change to how the header or tab bar is cleared applies to both.
 */
import { Platform, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Spacing } from '@/constants/theme';

export function useScreenPadding(): ViewStyle | undefined {
  const safeAreaInsets = useSafeAreaInsets();

  return Platform.select({
    /*
     * No top safe-area maths: `contentInsetAdjustmentBehavior` on the scroll
     * view already clears the header. The bottom is ours to handle now — the
     * tab bar is a floating JS view, so UIKit no longer insets for it the way
     * it did for the native tab bar.
     */
    ios: {
      paddingTop: Spacing.four,
      paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
    },
    android: {
      paddingTop: safeAreaInsets.top + Spacing.four,
      paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });
}
