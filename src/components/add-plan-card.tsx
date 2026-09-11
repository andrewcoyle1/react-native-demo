/**
 * The carousel's final page: an invitation to start another training block.
 *
 * Outlined and unfilled, so it reads as an empty slot waiting to be filled
 * rather than as a plan that already exists.
 */
import { Icon } from './icon';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AddPlanCardProps = {
  title?: string;
  body?: string;
  onPress?: () => void;
};

export function AddPlanCard({
  title = 'Create a new plan',
  body = 'Schedule your next training block',
  onPress,
}: AddPlanCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      style={({ pressed }) => [
        styles.card,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedView style={[styles.circle, { borderColor: theme.backgroundSelected }]}>
        <Icon name="plus" size={26} tintColor={theme.text} />
      </ThemedView>

      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        {body}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    /* Fills the carousel's page height, like the cards it sits beside. */
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 19,
    fontWeight: 600,
  },
  body: {
    fontSize: 15,
  },
});
