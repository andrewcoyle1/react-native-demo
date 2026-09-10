/**
 * Stack for the Plan tab.
 *
 * Headerless: the app header lives above the tab navigator (see
 * `(main)/_layout.tsx`) so that it takes no part in the tab wipe. This Stack is
 * what keeps the tab's route name "plan" rather than "plan/index", and gives the
 * tab somewhere to push detail screens.
 *
 * The training providers are mounted by the screen rather than here, because the
 * week being shown is state the screen owns — stepping a week has to change the
 * window they read, and a provider above the screen could not see that.
 */
import { Stack } from 'expo-router';

export default function PlanStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
