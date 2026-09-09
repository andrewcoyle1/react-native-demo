import { router } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { Card, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';

export default function DashboardSheet() {
  useScreenTracking('Dashboard sheet');

  return (
    <Screen subtitle="Presented with presentation: 'formSheet'.">
      <Card title="Sheet">
        <ThemedText type="small" themeColor="textSecondary">
          Rests at the detents set in the layout — 40% and 90% of the screen. Drag the
          grabber to move between them, or swipe down to dismiss. This is the direct
          equivalent of SwiftUI&apos;s `.sheet` with `.presentationDetents`.
        </ThemedText>
      </Card>

      <ActionButton title="Close" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
