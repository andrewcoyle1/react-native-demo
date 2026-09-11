/**
 * The tall, single-choice card used for both binary questions (a race in
 * mind, or not) and multi-way ones (choose a goal): an icon, a title, and a
 * description, in a card tall enough to read as a deliberate, weighty choice
 * rather than a row in a list.
 *
 * Two heights in the design — the two-card "race in mind" screen and the
 * three-card "goal" screen use different card proportions — so height is a
 * prop rather than a constant.
 */
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '../themed-text';

import { useTheme } from '@/hooks/use-theme';

type SelectableCardProps = {
  /** An emoji or a short SF Symbol-rendered glyph; the design mixes both. */
  icon: React.ReactNode;
  title: string;
  description: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SelectableCard({
  icon,
  title,
  description,
  selected = false,
  onPress,
  style,
}: SelectableCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? theme.text : theme.backgroundSelected,
          backgroundColor: selected ? theme.backgroundElement : 'transparent',
        },
        pressed && styles.pressed,
        style,
      ]}>
      <View style={styles.body}>
        <View style={styles.headline}>
          {icon}
          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  body: {
    gap: 14,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
  },
  pressed: {
    opacity: 0.7,
  },
});
