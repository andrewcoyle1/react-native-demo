/**
 * Each tab gets its own Stack so it can have a native header — NativeTabs alone
 * has no header to hang toolbar items on.
 */
import { Stack } from 'expo-router';

export default function TrendsStackLayout() {
  return <Stack screenOptions={{ title: 'Trends', headerLargeTitle: false }} />;
}
