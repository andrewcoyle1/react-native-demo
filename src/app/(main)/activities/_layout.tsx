/**
 * Stack for the Activities tab.
 *
 * Headerless: the app header lives above the tab navigator (see
 * `(main)/_layout.tsx`) so that it takes no part in the tab wipe. This Stack is
 * what keeps the tab's route name "activities" rather than "activities/index", and
 * gives the tab somewhere to push detail screens.
 */
import { Stack } from 'expo-router';

export default function ActivitiesStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
