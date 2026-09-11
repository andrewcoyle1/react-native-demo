/**
 * Layout for the signed-out flow: welcome, then sign in or sign up.
 *
 * `anchor` makes `welcome` the landing screen rather than relying on file order.
 */
import { Stack } from 'expo-router';

export const unstable_settings = { anchor: 'welcome' };

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
