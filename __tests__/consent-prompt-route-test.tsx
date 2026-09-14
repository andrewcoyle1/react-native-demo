/**
 * The consent prompt must be reachable from inside the setup flow.
 *
 * A real incident sits behind this. `settings` was registered inside the root's
 * `!needsSetup` guard, and `(setup)/_layout` raises the consent prompt by
 * pushing `/settings/analytics` the moment it mounts. In expo-router 58 a
 * screen behind a false guard is not removed — it renders as a redirect to
 * `redirectTo`, which here is the setup flow's own landing screen. So a brand
 * new athlete pushed a route that bounced back to `/race-or-not`, remounted the
 * setup layout, raised the prompt again, and stacked `/race-or-not` on itself
 * until the app was unusable.
 *
 * The guards are reproduced rather than imported because the real root layout
 * needs Firebase, a container and four providers to render, and none of that is
 * what broke. What broke is which guard the route sits behind.
 */
import { renderRouter, act } from 'expo-router/testing-library';
import { Stack, router, type Href } from 'expo-router';
import { Text } from 'react-native';

/*
 * The routes below are this test's own inline filesystem, so expo-router's
 * generated `Href` union — built from the real app directory — does not contain
 * them. Cast at the one place that navigates rather than weaken the type
 * everywhere.
 */
const href = (path: string) => path as Href;

/** The root's three gates, for an athlete who has signed up but has no profile. */
function RootLayout() {
  const user = true;
  const needsSetup = true;
  const landing = '/race-or-not';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={user && !needsSetup} redirectTo={landing}>
        <Stack.Screen name="(main)" />
      </Stack.Protected>

      {/* The line this test exists to hold: signed in, and nothing more. */}
      <Stack.Protected guard={user} redirectTo={landing}>
        <Stack.Screen name="settings" />
      </Stack.Protected>

      <Stack.Protected guard={needsSetup} redirectTo={landing}>
        <Stack.Screen name="(setup)" />
      </Stack.Protected>
    </Stack>
  );
}

const ROUTES = {
  _layout: RootLayout,
  '(main)/index': () => <Text>Dashboard</Text>,
  '(setup)/_layout': () => <Stack screenOptions={{ headerShown: false }} />,
  '(setup)/race-or-not': () => <Text>Race or not</Text>,
  'settings/_layout': () => <Stack screenOptions={{ headerShown: false }} />,
  'settings/analytics': () => <Text>Analytics consent</Text>,
};

it('opens the consent prompt instead of bouncing back into setup', async () => {
  const app = renderRouter(ROUTES, { initialUrl: '/race-or-not' });
  await app;
  expect(app.getPathname()).toBe('/race-or-not');

  await act(async () => {
    router.push(href('/settings/analytics'));
  });

  // The bug: this read '/race-or-not', and every remount pushed another one.
  expect(app.getPathname()).toBe('/settings/analytics');
});

it('still keeps an athlete in setup out of the tabs', async () => {
  const app = renderRouter(ROUTES, { initialUrl: '/race-or-not' });
  await app;

  await act(async () => {
    router.push(href('/(main)'));
  });

  // Widening the settings guard must not widen this one: someone with no
  // profile yet has nothing to show on the dashboard.
  expect(app.getPathname()).toBe('/race-or-not');
});
