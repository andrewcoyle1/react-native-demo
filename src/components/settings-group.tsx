/**
 * A labelled run of settings rows.
 *
 * The label is outside the rows rather than inside a container, so the group
 * reads as a heading over separate cards — which is what lets one row in the
 * group carry its own accent without breaking a shared box.
 */
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

type SettingsGroupProps = {
  label?: string;
  /** Tints the label — the danger zone's is red. */
  labelAccent?: string;
  children: ReactNode;
};

export function SettingsGroup({ label, labelAccent, children }: SettingsGroupProps) {
  return (
    <ThemedView style={styles.group}>
      {label ? (
        <ThemedText
          themeColor="textSecondary"
          style={[styles.label, labelAccent ? { color: labelAccent } : null]}>
          {label.toUpperCase()}
        </ThemedText>
      ) : null}
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.8,
    marginBottom: Spacing.one,
  },
});
