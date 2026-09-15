/**
 * Stack for the Trends tab.
 *
 * Headerless: the app header lives above the tab navigator (see
 * `(main)/_layout.tsx`) so that it takes no part in the tab wipe. This Stack is
 * what keeps the tab's route name "trends" rather than "trends/index".
 *
 * `TrendsProvider` is mounted here with the window the screen reports on — the
 * training week — for the same reason sessions are: the span is the tab's, not
 * the app's.
 */
import { Stack } from 'expo-router';
import { useMemo } from 'react';

import { addDays, toDateKey } from '@/domain/training';
import { TrendsProvider } from '@/providers/trends-provider';
import { useServices } from '@/providers/services-provider';

export default function TrendsStackLayout() {
  const services = useServices();
  /** The Monday-to-Sunday week, matching what the Plan tab reports on. */
  const window = useMemo(() => {
    const today = new Date();
    // getDay is 0 on Sunday, which belongs to the week that began six days back.
    const monday = addDays(toDateKey(today), -((today.getDay() + 6) % 7));
    return { from: monday, to: addDays(monday, 6) };
  }, []);

  return (
    <TrendsProvider window={window} service={services.trends}>
      <Stack screenOptions={{ headerShown: false }} />
    </TrendsProvider>
  );
}
