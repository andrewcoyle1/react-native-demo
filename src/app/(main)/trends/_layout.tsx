/**
 * Stack for the Trends tab.
 *
 * Headerless: the app header lives above the tab navigator (see
 * `(main)/_layout.tsx`) so that it takes no part in the tab wipe. This Stack is
 * what keeps the tab's route name "trends" rather than "trends/index", and
 * gives the tab somewhere to push detail screens.
 */
import { Stack } from 'expo-router';

export default function TrendsStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
