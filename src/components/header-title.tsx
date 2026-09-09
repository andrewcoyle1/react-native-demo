/**
 * The screen name with the subscription state beside it.
 *
 * A component rather than a `title` string because the badge has to sit inside
 * the header's title slot — anything else would put it in the leading or
 * trailing area, away from the name it qualifies.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { TrialBadge } from './trial-badge';

import { Spacing } from '@/constants/theme';

type HeaderTitleProps = {
  title: string;
};

export function HeaderTitle({ title }: HeaderTitleProps) {
  return (
    <View style={styles.headerTitle}>
      <ThemedText style={styles.wordmark}>{title}</ThemedText>
      <TrialBadge />
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: 700,
  },
});
