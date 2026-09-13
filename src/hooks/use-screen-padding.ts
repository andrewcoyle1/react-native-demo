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
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
    /*
     * No top safe-area maths on either platform.
     *
     * `AppHeader` is a sibling *above* the tab navigator, not an overlay, so it
     * has already taken `insets.top` out of the layout and the content below it
     * starts in clear space. Adding the inset again here counted the status bar
     * twice and left a band of dead space under the header — which is what it
     * used to do on Android, where this branch carried a `safeAreaInsets.top`
     * that iOS had already had removed.
     *
     * The bottom is ours to handle, though: the tab bar is a floating JS view,
     * so UIKit no longer insets for it the way it did for the native one.
     */
    default: {
      paddingTop: Spacing.four,
      paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
    },
  });
}
