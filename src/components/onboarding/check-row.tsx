/**
 * The "I'm not sure" / "I don't know my heart rate range" row: a square
 * checkbox and a label, both dimmed — an escape hatch from a field the
 * athlete may not have an answer for, not a real preference.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../themed-text';

import { useTheme } from '@/hooks/use-theme';

export function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.box, { borderColor: theme.textSecondary }]}>
        {checked ? <View style={[styles.dot, { backgroundColor: theme.text }]} /> : null}
      </View>
      <ThemedText themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
