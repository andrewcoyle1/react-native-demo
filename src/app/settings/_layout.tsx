/**
 * The profile's settings modals.
 *
 * They live here, above `(main)`, rather than inside the Profile tab's own
 * stack — which is where they started. A route nested in that stack sits
 * *inside* the tab navigator, so `AppTabs`' floating bar draws over the top of
 * the dialog. Presented from the root, they cover the tab bar as a modal
 * should, which is also where `modal` and `sheet` already sit.
 *
 * The screen underneath stays mounted and visible either way, so the blurred
 * ground is still the profile list the athlete just tapped.
 */
import { Stack } from 'expo-router';

export default function SettingsModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        /* Transparent all the way down: the root screen is what carries the
           `transparentModal` presentation, and an opaque background anywhere in
           between would hide the screen it is supposed to blur. */
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'none',
      }}
    />
  );
}
