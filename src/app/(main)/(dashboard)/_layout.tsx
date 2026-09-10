/**
 * Stack for the Dashboard tab.
 *
 * Headerless: the app header lives above the tab navigator (see
 * `(main)/_layout.tsx`) so that it takes no part in the tab wipe. This Stack is
 * what keeps the tab's route name "(dashboard)" rather than "(dashboard)/index", and
 * gives the tab somewhere to push detail screens.
 *
 * `SessionsProvider` is mounted here rather than in `(main)/_layout.tsx` because
 * the window is per-tab: the dashboard shows the week ahead, while the Plan tab
 * reads a whole month. Mounting it once above both would force one span on them.
 */
import { Stack } from 'expo-router';
import { useMemo } from 'react';

import { addDays, toDateKey } from '@/domain/training';
import { SessionsProvider } from '@/providers/sessions-provider';
import { services } from '@/services/container';

/** Today plus six: the seven days the dashboard lists. */
const DaysAhead = 6;

export default function DashboardStackLayout() {
  // Recomputed only when this layout remounts, which is enough: the day headings
  // derive their own labels, so a session does not move when midnight passes.
  const window = useMemo(() => {
    const today = toDateKey(new Date());
    return { from: today, to: addDays(today, DaysAhead) };
  }, []);

  return (
    <SessionsProvider window={window} service={services.sessions}>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionsProvider>
  );
}
