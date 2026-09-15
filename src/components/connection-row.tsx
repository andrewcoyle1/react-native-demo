/**
 * Where a planned session can be sent — a watch, or a file for an indoor app.
 *
 * Tinted per destination rather than uniform, because these are two different
 * kinds of act: one pushes the workout to a device that already has it, the
 * other hands the athlete a file to take somewhere else. The design separates
 * them by colour, and the subtitle says which is which.
 */
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

import { AccentFillOpacity, Spacing } from '@/constants/theme';

export type ConnectionRowProps = {
  title: string;
  /** "Synced on Sep 13 at 5:04 PM", or what the file is for. */
  subtitle: string | null;
  icon: SFSymbol;
  accent: string;
  onPress?: () => void;
};

export function ConnectionRow({ title, subtitle, icon, accent, onPress }: ConnectionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [
        styles.row,
        { borderColor: accent, backgroundColor: `${accent}${AccentFillOpacity}` },
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={16} tintColor={accent} style={styles.icon} />

      <View style={styles.text}>
        <ThemedText style={[styles.title, { color: accent }]}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
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
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  icon: {
    /* Nudges the glyph onto the title's optical baseline. */
    marginTop: 1,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.6,
  },
});
