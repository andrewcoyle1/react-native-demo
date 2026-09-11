/**
 * The Beginner / Intermediate / Advanced control on each ability screen.
 *
 * Three equal cells, the selected one taking the discipline's accent colour
 * on both border and label; unselected cells stay neutral. The small ring
 * glyph in each cell is decorative — the design's own placeholder for a
 * level indicator, not a real progress ring — so it is drawn as a plain
 * partial-arc rather than wired to anything.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../themed-text';

import { useTheme } from '@/hooks/use-theme';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

const Levels: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function SegmentedControl({
  value,
  onChange,
  accent,
}: {
  value: ExperienceLevel;
  onChange: (level: ExperienceLevel) => void;
  accent: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {Levels.map(level => {
        const active = level.value === value;
        return (
          <Pressable
            key={level.value}
            onPress={() => onChange(level.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={level.label}
            style={({ pressed }) => [
              styles.cell,
              { borderColor: active ? accent : theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <View style={[styles.ring, { borderColor: active ? accent : theme.textSecondary }]} />
            <ThemedText
              style={[styles.label, { color: active ? theme.text : theme.textSecondary }]}
              numberOfLines={1}>
              {level.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  ring: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderTopColor: 'transparent',
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
});
