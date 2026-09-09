/**
 * Each tab gets its own Stack so it can have a native header — NativeTabs alone
 * has no header to hang toolbar items on.
 *
 * The extra screens are declared here purely to set how they are presented.
 */
import { Stack } from 'expo-router';

export default function DashboardStackLayout() {
  return (
    <Stack screenOptions={{ title: 'stamina', headerLargeTitle: false }}>
      <Stack.Screen name="index" />

      {/* A normal push: slides in from the trailing edge with a back button,
          and keeps the tab bar. No `presentation` needed — 'card' is default. */}
      <Stack.Screen name="account" options={{ title: 'Account', headerLargeTitle: false }} />

      {/* A custom alert. `transparentModal` keeps the screen underneath mounted
          and visible, and a transparent contentStyle lets our own scrim show
          through — without it the screen paints an opaque background and the
          overlay looks like a full cover. `fade` replaces the slide-up. */}
      <Stack.Screen
        name="modal"
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />

      {/* The SwiftUI `.sheet` equivalent: a form sheet that rests at detents.
          `sheetAllowedDetents` is this API's `.presentationDetents`. */}
      <Stack.Screen
        name="sheet"
        options={{
          presentation: 'formSheet',
          title: 'Sheet',
          sheetAllowedDetents: [0.4, 0.9],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
