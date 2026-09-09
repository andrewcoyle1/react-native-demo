/**
 * Stack for the Profile tab.
 *
 * Profile is a tab screen rather than a route pushed over the tabs, which is
 * what lets it wipe in like the others. It is hidden from the tab bar — the
 * header's avatar button is how you reach it.
 */
import { Stack } from 'expo-router';

export default function ProfileStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
