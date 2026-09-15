/**
 * The workout detail sheet.
 *
 * Registered at the root, above `(main)`, for the same reason the settings
 * modals are: a route nested in the tab navigator sits *inside* it, and
 * `AppTabs`' floating bar would draw over the top of the sheet. Presented from
 * here it covers the tab bar, as a sheet should.
 */
import { Stack } from 'expo-router';

export default function SessionSheetLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
