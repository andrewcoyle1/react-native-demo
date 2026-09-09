/**
 * End-of-list prompt: a question, an explanation, and somewhere to go next.
 *
 * Outlined like `ActionRow` rather than filled, so it closes the list without
 * looking like one more workout.
 */
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { AccentFillOpacity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PromptCardProps = {
  title: string;
  body: string;
  icon: SFSymbol;
  /** Hex accent from `Accents`, tinting the circular button. */
  accent: string;
  onPress?: () => void;
};

export function PromptCard({ title, body, icon, accent, onPress }: PromptCardProps) {
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
      <View style={styles.text}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.body}>
          {body}
        </ThemedText>
      </View>

      {/* Decorative: the whole card is the button, so the circle is not a second
          target and carries no label of its own. */}
      <View style={[styles.button, { backgroundColor: `${accent}${AccentFillOpacity}` }]}>
        <SymbolView name={icon} size={22} tintColor={accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    /* Lets the copy wrap inside the card instead of pushing the button out. */
    flex: 1,
    gap: Spacing.two,
  },
  title: {
    fontSize: 19,
    fontWeight: 700,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
