/**
 * The "Free trial" capsule beside the app name in the header.
 *
 * `experimental_backgroundImage` is React Native's CSS-gradient syntax. It keeps
 * the gradient in the existing bundle — the alternative, expo-linear-gradient,
 * is a native module and would need a rebuild of the dev client to add.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';

type TrialBadgeProps = {
  label?: string;
};

export function TrialBadge({ label = 'Free trial' }: TrialBadgeProps) {
  return (
    <View style={styles.badge}>
      <ThemedText style={styles.label}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 2,
    borderRadius: 999,
    experimental_backgroundImage: 'linear-gradient(100deg, #E8558C 0%, #A855C8 50%, #3B6FE0 100%)',
  },
  /* Fixed white, not a theme token: the surface under it is the gradient, which
     is the same in both appearances. */
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 600,
  },
});
