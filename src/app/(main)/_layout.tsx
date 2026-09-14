/**
 * Layout for the signed-in app.
 *
 * Only mounted when the root gate in `src/app/_layout.tsx` says there is a user,
 * so every screen below it can assume one exists.
 *
 * The header is rendered here, as a sibling above the tabs, so that switching
 * tabs wipes only the content beneath it.
 *
 * `TrainingProvider` is mounted here rather than per-tab because plans, races
 * and the schedule are read the same way everywhere — unlike sessions, whose
 * window differs by tab, so that provider lives in each tab's own layout.
 */
import { View, StyleSheet } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { AppHeader } from '@/components/app-header';
import { useAnalyticsConsentPrompt } from '@/hooks/use-analytics-consent';
import { TrainingProvider } from '@/providers/training-provider';
import { services } from '@/services/container';

export default function MainLayout() {
  /*
   * The prompt's other home. `(setup)` asks everyone going through
   * personalisation; this catches the athlete who already has a profile and so
   * never passes through it — a reinstall, or a second account on the handset.
   */
  useAnalyticsConsentPrompt();

  return (
    <TrainingProvider service={services.training}>
      <View style={styles.container}>
        <AppHeader />
        <AppTabs />
      </View>
    </TrainingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
