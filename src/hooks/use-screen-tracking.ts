import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { trackScreenView } from '@/services/telemetry';

/**
 * Logs an Analytics `screen_view` each time the screen gains focus. Tab screens
 * stay mounted when backgrounded, so mount-time logging would miss re-entries.
 */
export function useScreenTracking(screenName: string) {
  useFocusEffect(
    useCallback(() => {
      trackScreenView(screenName);
    }, [screenName]),
  );
}
