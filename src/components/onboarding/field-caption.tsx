/**
 * The small green label that heads a field on the body-metrics and fitness
 * screens — "Height", "Weight", "Heart Rate Range" — always
 * `ActivePlanAccent`, the same green as the progress bar.
 */
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '../themed-text';

import { ActivePlanAccent } from '@/constants/theme';

export function FieldCaption({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  return <ThemedText style={[styles.caption, style]}>{children}</ThemedText>;
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
