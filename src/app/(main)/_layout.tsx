/**
 * Layout for the signed-in app.
 *
 * Only mounted when the root gate in `src/app/_layout.tsx` says there is a user,
 * so every screen below it can assume one exists.
 *
 * The header is rendered here, as a sibling above the tabs, so that switching
 * tabs wipes only the content beneath it.
 */
import { View, StyleSheet } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { AppHeader } from '@/components/app-header';

export default function MainLayout() {
  return (
    <View style={styles.container}>
      <AppHeader />
      <AppTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
