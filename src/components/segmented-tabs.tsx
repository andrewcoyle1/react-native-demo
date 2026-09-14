/**
 * The Planned / Completed switch, floating over the sheet's content.
 *
 * Pinned rather than scrolled: it is how the athlete moves between the two
 * halves of a session, so it has to stay reachable from anywhere in either.
 * The content runs underneath it, which is why it takes the glass treatment —
 * the same one the release-notes sheet's footer uses, and for the same reason.
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { useTheme } from '@/hooks/use-theme';

/** Liquid glass is iOS 26+; elsewhere the bar needs a solid fill to read. */
const glassAvailable = isLiquidGlassAvailable();

export type SegmentedTab<T extends string> = {
  value: T;
  label: string;
  /** A tab with nothing behind it yet — shown, but not selectable. */
  disabled?: boolean;
};

type SegmentedTabsProps<T extends string> = {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({ tabs, value, onChange }: SegmentedTabsProps<T>) {
  const theme = useTheme();

  return (
    <GlassView
      glassEffectStyle="regular"
      style={[styles.bar, !glassAvailable && { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.row}>
        {tabs.map(tab => {
          const selected = tab.value === value;

          return (
            <Pressable
              key={tab.value}
              onPress={() => !tab.disabled && onChange(tab.value)}
              disabled={tab.disabled}
              accessibilityRole="tab"
              accessibilityState={{ selected, disabled: tab.disabled }}
              accessibilityLabel={tab.label}
              style={({ pressed }) => [
                styles.segment,
                selected && { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                themeColor={selected ? 'text' : 'textSecondary'}
                style={[styles.label, tab.disabled && styles.disabled]}>
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 999,
    /* Clips the selected segment's fill to the bar's rounded ends. */
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 999,
  },
  label: {
    fontSize: 15,
    fontWeight: 600,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
