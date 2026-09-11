/**
 * The small green label that heads a field on the body-metrics and fitness
 * screens — "Height", "Weight", "Heart Rate Range" — always
 * `ActivePlanAccent`, the same green as the progress bar.
 */
import { StyleSheet } from 'react-native';

import { ThemedText } from '../themed-text';

import { ActivePlanAccent } from '@/constants/theme';

export function FieldCaption({ children }: { children: string }) {
  return <ThemedText style={styles.caption}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  caption: {
    color: ActivePlanAccent,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 10,
  },
});
