/**
 * Layout for the signed-out flow: intro carousel, then sign-in.
 *
 * `anchor` makes `intro` the landing screen rather than relying on file order.
 */
import { Stack } from 'expo-router';

export const unstable_settings = { anchor: 'intro' };

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
