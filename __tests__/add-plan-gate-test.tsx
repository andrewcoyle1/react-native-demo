/**
 * The setup flow is reachable for two different reasons.
 *
 * Normally an athlete is there because they have no profile yet, which the
 * root gate works out for itself. Adding a plan is the other reason, and the
 * gate cannot infer it: from its point of view an athlete adding a second plan
 * is a fully onboarded one who belongs in the tabs.
 *
 * This is the same shape as the consent-prompt loop — a screen behind a false
 * guard is not removed in expo-router 58, it redirects — so without the intent
 * the "add a plan" button would bounce straight back to the Dashboard, and
 * with the intent left set afterwards the athlete would be stuck in the flow.
 */
import { renderRouter, act } from 'expo-router/testing-library';
import { Stack, router, type Href } from 'expo-router';
import { Text } from 'react-native';

const href = (path: string) => path as Href;

/** The root's gates, for an athlete who has a profile already. */
function rootLayout(addingPlan: boolean) {
  return function RootLayout() {
    const needsSetup = false;

    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!needsSetup} redirectTo={href('/')}>
          <Stack.Screen name="(main)" />
        </Stack.Protected>

        <Stack.Protected guard={needsSetup || addingPlan} redirectTo={href('/')}>
          <Stack.Screen name="(setup)" />
        </Stack.Protected>
      </Stack>
    );
  };
}

const routes = (addingPlan: boolean) => ({
  _layout: rootLayout(addingPlan),
  '(main)/index': () => <Text>Dashboard</Text>,
  '(setup)/_layout': () => <Stack screenOptions={{ headerShown: false }} />,
  '(setup)/race-or-not': () => <Text>Do you have a race in mind?</Text>,
});

it('lets an onboarded athlete into the flow once they mean to add a plan', async () => {
  const app = renderRouter(routes(true), { initialUrl: '/' });
  await app;
  expect(app.getPathname()).toBe('/');

  await act(async () => {
    router.push(href('/race-or-not'));
  });

  expect(app.getPathname()).toBe('/race-or-not');
});

it('keeps them out of it when they do not', async () => {
  const app = renderRouter(routes(false), { initialUrl: '/' });
  await app;

  await act(async () => {
    router.push(href('/race-or-not'));
  });

  // Not an error and not a no-op — a guarded-off screen redirects, which is
  // why the intent must be raised before the push rather than after it.
  expect(app.getPathname()).toBe('/');
});

it('leaves the tabs reachable throughout', async () => {
  const app = renderRouter(routes(true), { initialUrl: '/race-or-not' });
  await app;

  // `(main)`'s own guard is still true while adding a plan, so the flow pushes
  // over the tabs and backing out returns to the Dashboard rather than
  // unmounting it.
  await act(async () => {
    router.push(href('/'));
  });

  expect(app.getPathname()).toBe('/');
});
