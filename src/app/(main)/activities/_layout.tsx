/**
 * Stack for the Activities tab.
 *
 * Headerless: the app header lives above the tab navigator (see
 * `(main)/_layout.tsx`) so that it takes no part in the tab wipe. This Stack is
 * what keeps the tab's route name "activities" rather than "activities/index", and
 * gives the tab somewhere to push detail screens.
 *
 * `ActivitiesProvider` is mounted here rather than in `(main)/_layout.tsx` so
 * that the paged history is read when the tab is first opened, not on launch.
 */
import { Stack } from 'expo-router';

import { ActivitiesProvider } from '@/providers/activities-provider';
import { useServices } from '@/providers/services-provider';

export default function ActivitiesStackLayout() {
  const services = useServices();
  return (
    <ActivitiesProvider service={services.activities}>
      <Stack screenOptions={{ headerShown: false }} />
    </ActivitiesProvider>
  );
}
