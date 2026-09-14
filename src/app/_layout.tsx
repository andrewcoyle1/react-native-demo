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
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/*
 * The app's only stylesheet import, and the entry point of the whole NativeWind
 * pipeline: react-native-css has no `input` option, it compiles whichever
 * `.css` file the bundle reaches. It belongs at the root, before any screen.
 *
 * Below the `react-native` import above, and that ordering is load-bearing.
 * Imports evaluate in source order, and this one pulls in react-native-css's
 * runtime, whose `native/reactivity.ts` calls `Dimensions.get("window")` at
 * module scope. Reached before React Native has initialised, `Dimensions` is
 * undefined and the app dies with "Cannot read property 'get' of undefined"
 * before the runtime is ready — which is exactly what `@expo/log-box`'s own
 * stylesheet used to cause from inside `expo-router/entry`, until
 * `metro-css-transformer.js` stopped that file being compiled as one.
 *
 * Keeping `react-native` first means this file cannot be the one to do it.
 */
import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useApplyAnalyticsConsent } from '@/hooks/use-analytics-consent';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { DevicePreferencesProvider } from '@/providers/device-preferences';
import { NotesProvider } from '@/providers/notes-provider';
import { SettingsProvider } from '@/providers/settings-provider';
import { UserProvider, useUser } from '@/providers/user-provider';
import { ServicesProvider, useServices } from '@/providers/services-provider';
import { createServices } from '@/services/container';

// Runs once on import, before any component renders. Keeps the native splash on
// screen instead of letting it disappear the instant the app launches.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  /*
   * The one place the container is built.
   *
   * `useMemo` with no dependencies rather than a module constant: building it
   * here is what makes the environment an argument instead of something fixed
   * when the first import ran. Note for development — because it is memoised on
   * mount, editing `container.ts` needs a full reload, not Fast Refresh.
   */
  const services = useMemo(() => createServices(), []);

  return (
    /* Required by react-native-gesture-handler v2 for any GestureDetector below
       it — the Plan tab's week swipe is the first of them. */
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ServicesProvider services={services}>
          {/* Outside AuthProvider on purpose: these belong to the install, not
              to the athlete, so signing out must not reset them. */}
          <DevicePreferencesProvider>
            <AppProviders />
          </DevicePreferencesProvider>
        </ServicesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The account-scoped providers.
 *
 * Split from `RootLayout` only because a component cannot read a context it
 * renders itself — the services have to come from above this point.
 */
function AppProviders() {
  const services = useServices();

  return (
    <AuthProvider service={services.auth}>
      {/* Below AuthProvider: both read the signed-in uid from it. */}
      <UserProvider service={services.user}>
        {/* Above the navigator rather than inside `(main)`: the profile's
            settings modals are root-level routes, so a provider mounted below
            this point would not reach them. */}
        <SettingsProvider service={services.settings}>
          <NotesProvider service={services.notes}>
            <RootNavigator />
          </NotesProvider>
        </SettingsProvider>
      </UserProvider>
    </AuthProvider>
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
   * Applied here rather than inside `(main)`: signing out has to turn tracking
   * off too, and `(main)` is unmounted by then.
   */
  useApplyAnalyticsConsent();

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

  /*
   * Exactly one of the three guards below is true at any moment, so this is the
   * screen the athlete should be on right now. Every guarded-off branch
   * redirects here, which is what `Protected` needs since the root Stack has no
   * anchor of its own to fall back to.
   */
  const landing: Href = !user ? '/welcome' : needsSetup ? '/race-or-not' : '/';

  return (
    <>
      {/* Plays the logo animation, then hides the native splash. */}
      <AnimatedSplashOverlay />

      <Stack screenOptions={{ headerShown: false }}>
        {/* expo-router 58 changed `Protected`: a screen whose guard is false is
            no longer removed from the navigator, it is rendered as a redirect to
            `redirectTo` (defaulting to the containing navigator's anchor — which
            this root Stack does not declare, so it must be passed explicitly or
            the app lands on +not-found). Deep links to a guarded screen still
            cannot reach it; they redirect instead.

            Flipping a guard swaps one screen for another, which the navigator
            treats as a replace. `animationTypeForReplace` decides which way that
            replace appears to travel, so signing in reads as going forward and
            signing out as coming back. Both are set explicitly rather than left
            to the default, so neither direction is accidental. */}
        <Stack.Protected guard={!!user && !needsSetup} redirectTo={landing}>
          <Stack.Screen name="(main)" options={{ animationTypeForReplace: 'push' }} />

          {/* Feedback and notifications live here, above the tabs, so they can
              float over whichever tab is showing. Profile is deliberately not
              here: it is a tab screen, so that opening it wipes like the rest
              rather than sliding in over the top. */}

          {/* A custom alert. `transparentModal` keeps the screen underneath
              mounted and visible, and a transparent contentStyle lets the
              backdrop show through — without it the screen paints an opaque
              background and the overlay looks like a full cover.

              `none` rather than the `fade` this used to carry: on iOS that
              fade is an alpha animation on the presented screen's view, and an
              alpha below 1 anywhere above a `GlassView` stops the glass
              rendering — see `components/modal-backdrop.tsx`. The backdrop
              brings itself in there instead. */}
          <Stack.Screen
            name="modal"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />

          {/* The workout detail sheet. A form sheet like `sheet` below, but
              taller and dismissible by drag alone — it is a place to read
              rather than a notice to acknowledge, so it carries no header and
              no confirm button. Registered here rather than inside `(main)`
              so it covers the floating tab bar; `session/_layout.tsx` says
              more. */}
          <Stack.Screen
            name="session"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetAllowedDetents: [0.96],
              sheetGrabberVisible: true,
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

        {/* The profile's settings modals, as one group. Registered here
            rather than inside the Profile tab so they cover the floating tab
            bar; `app/settings/_layout.tsx` says more about why.

            Guarded on the athlete being signed in and nothing more — NOT on
            `!needsSetup`, which is where this used to sit and which made the
            app unusable for anyone new. `settings/analytics` is the consent
            prompt, and `(setup)/_layout` raises it on mount by design. A
            screen behind a false guard is not removed in expo-router 58, it
            renders as a redirect to `redirectTo` — so during setup the prompt
            pushed a route that bounced straight back to `/race-or-not`, the
            setup layout remounted, raised the prompt again, and pushed
            `/race-or-not` on top of itself without end.

            Anything under `settings` is reached only by an explicit push, so
            widening the guard opens nothing the athlete can stumble into. */}
        <Stack.Protected guard={!!user} redirectTo={landing}>
          <Stack.Screen
            name="settings"
            options={{
              /* `none` for the same reason as `modal` above. */
              presentation: 'transparentModal',
              animation: 'none',
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </Stack.Protected>

        {/* A signed-up athlete with no profile yet — the personalisation flow,
            from "Do you have a race in mind?" through the plan overview. Its
            own screen order and progress bar are `(setup)`'s concern; this
            gate only decides whether the athlete can reach it at all. */}
        <Stack.Protected guard={needsSetup} redirectTo={landing}>
          <Stack.Screen name="(setup)" options={{ animationTypeForReplace: 'push' }} />
        </Stack.Protected>

        <Stack.Protected guard={!user} redirectTo={landing}>
          <Stack.Screen name="(onboarding)" options={{ animationTypeForReplace: 'pop' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
