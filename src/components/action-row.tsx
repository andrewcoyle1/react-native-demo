/**
 * Outlined row that opens something else — icon, title, supporting line.
 *
 * Outlined rather than filled so it reads as a prompt sitting between sections,
 * not as another card of content.
 */
import { Icon } from './icon';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { AccentFillOpacity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ActionRowProps = {
  title: string;
  subtitle?: string;
  icon: SFSymbol;
  /** Hex accent from `Accents`, tinting the icon tile. */
  accent: string;
  onPress?: () => void;
};

export function ActionRow({ title, subtitle, icon, accent, onPress }: ActionRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      // Dimming the whole row on press keeps the feedback in one place rather
      // than lighting up the icon tile and the text separately.
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.iconTile, { backgroundColor: `${accent}${AccentFillOpacity}` }]}>
        <Icon name={icon} size={22} tintColor={accent} />
      </View>

      <View style={styles.text}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    /* Lets a long title wrap inside the row instead of pushing the tile out. */
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
  },
});
