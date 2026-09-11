// ─────────────────────────────────────────────────────────────────────────────
// ROOT LAYOUT
//
// In expo-router, a file named `_layout.tsx` does NOT become a screen of its own.
// It *wraps* every route in its folder — and because this one sits at the top of
// `src/app/`, it wraps the whole app and stays mounted while you navigate.
//
// It does two jobs: install the app-wide providers, and decide which half of the
// app you are allowed into.
// ─────────────────────────────────────────────────────────────────────────────
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { NotesProvider } from '@/providers/notes-provider';
import { UserProvider, useUser } from '@/providers/user-provider';
import { services } from '@/services/container';

// Runs once on import, before any component renders. Keeps the native splash on
// screen instead of letting it disappear the instant the app launches.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    /* Required by react-native-gesture-handler v2 for any GestureDetector below
       it — the Plan tab's week swipe is the first of them. */
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider service={services.auth}>
          {/* Below AuthProvider: both read the signed-in uid from it. */}
          <UserProvider service={services.user}>
            <NotesProvider service={services.notes}>
              <RootNavigator />
            </NotesProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The gate. Signed-out users get the onboarding flow; a signed-in user with no
 * profile yet gets the personalisation flow; everyone else gets the tabs — and
 * nothing else is even registered with the navigator.
 */
function RootNavigator() {
  const { user, initializing } = useAuth();
  const { state: profile } = useUser();

  /*
   * Render nothing until both auth *and*, for a signed-in user, the profile
   * check have resolved. The splash overlay is a child of this component, so
   * it does not mount either — which leaves the *native* splash covering the
   * screen and means the first thing drawn is already the correct one of the
   * three sides, with no flash of a wrong one — including a signed-up athlete
   * flashing into the tabs before "no profile yet" is known.
   */
  if (initializing || (user && profile.status === 'loading')) {
    return null;
  }

  /*
   * `GET /v1/profile` failing (a network blip on launch, say) must not read as
   * "needs onboarding" — an established athlete would be thrown back into
   * setup on every dropped connection. It reads as "has a profile" instead,
   * the same way `apiAuthService` stays optimistically signed in when the
   * server cannot be reached: the far more common case by orders of magnitude
   * is an existing athlete, and (main)'s own screens already have their own
   * per-slice error states for a request that keeps failing.
   */
  const needsSetup = !!user && profile.status === 'absent';

  return (
    <>
      {/* Plays the logo animation, then hides the native splash. */}
      <AnimatedSplashOverlay />

      <Stack screenOptions={{ headerShown: false }}>
        {/* `Protected` removes its screens from the navigator entirely when the
            guard is false — they cannot be reached by deep link either, which a
            merely-hidden route still could.

            Flipping a guard swaps one screen for another, which the navigator
            treats as a replace. `animationTypeForReplace` decides which way that
            replace appears to travel, so signing in reads as going forward and
            signing out as coming back. Both are set explicitly rather than left
            to the default, so neither direction is accidental. */}
        <Stack.Protected guard={!!user && !needsSetup}>
          <Stack.Screen name="(main)" options={{ animationTypeForReplace: 'push' }} />

          {/* Feedback and notifications live here, above the tabs, so they can
              float over whichever tab is showing. Profile is deliberately not
              here: it is a tab screen, so that opening it wipes like the rest
              rather than sliding in over the top. */}

          {/* A custom alert. `transparentModal` keeps the screen underneath
              mounted and visible, and a transparent contentStyle lets the
              backdrop show through — without it the screen paints an opaque
              background and the overlay looks like a full cover. `fade`
              replaces the slide-up. */}
          <Stack.Screen
            name="modal"
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />

          {/* The SwiftUI `.sheet` equivalent: a form sheet that rests at
              detents. `sheetAllowedDetents` is this API's
              `.presentationDetents`. */}
          <Stack.Screen
            name="sheet"
            options={{
              presentation: 'formSheet',
              /* No header: the sheet carries its own title, and the grabber is
                 the only chrome the design shows. */
              headerShown: false,
              title: "What's new",
              /* One large detent: the design shows the sheet just clear of the
                 status bar, not resting at a half height. */
              sheetAllowedDetents: [0.94],
              sheetGrabberVisible: true,
            }}
          />
        </Stack.Protected>

        {/* A signed-up athlete with no profile yet — the personalisation flow,
            from "Do you have a race in mind?" through the plan overview. Its
            own screen order and progress bar are `(setup)`'s concern; this
            gate only decides whether the athlete can reach it at all. */}
        <Stack.Protected guard={needsSetup}>
          <Stack.Screen name="(setup)" options={{ animationTypeForReplace: 'push' }} />
        </Stack.Protected>

        <Stack.Protected guard={!user}>
          <Stack.Screen name="(onboarding)" options={{ animationTypeForReplace: 'pop' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
