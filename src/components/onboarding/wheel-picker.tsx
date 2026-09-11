/**
 * The spinning number field behind date of birth, height, weight, heart
 * rate, FTP and the two threshold paces.
 *
 * The design draws each as an odometer of independent digit columns, but a
 * single scrolling wheel bound to the real value underneath reads almost
 * identically — large centred number, faded neighbours above and below —
 * while being simpler and more honest about what is actually selectable:
 * an odometer of independent digits would let you dial in combinations the
 * value's range forbids (a height of "199" cm one digit past its max).
 *
 * Built on a plain `ScrollView` rather than `FlatList` — every range here
 * (a few dozen to a few hundred items) is cheap to render in full, and a
 * `FlatList` nested inside `OnboardingStep`'s own `ScrollView` trips React
 * Native's "VirtualizedLists should never be nested" warning. `snapToInterval`
 * stops exactly on a value; `onMomentumScrollEnd` reads back which one landed
 * centre.
 */
import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '../themed-text';

import { useTheme } from '@/hooks/use-theme';

const ITEM_HEIGHT = 64;
const VISIBLE_NEIGHBOURS = 1;

type WheelPickerProps = {
  /** Inclusive. */
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  /** e.g. a leading zero-pad to 2 digits for minutes. */
  format?: (value: number) => string;
  width?: number;
};

export function WheelPicker({
  min,
  max,
  step = 1,
  value,
  onChange,
  format = String,
  width = 96,
}: WheelPickerProps) {
  const theme = useTheme();
  const values = useMemo(() => {
    const out: number[] = [];
    for (let v = min; v <= max; v += step) out.push(v);
    return out;
  }, [min, max, step]);

  const index = Math.max(0, Math.round((value - min) / step));

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const rounded = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, rounded));
    const picked = values[clamped];
    if (picked !== undefined && picked !== value) onChange(picked);
  }

  return (
    <View style={[styles.wrap, { width, height: ITEM_HEIGHT * (1 + 2 * VISIBLE_NEIGHBOURS) }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: index * ITEM_HEIGHT }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * VISIBLE_NEIGHBOURS }}
        onMomentumScrollEnd={handleMomentumEnd}>
        {values.map((item, i) => {
          const isCentre = i === index;
          return (
            <View key={item} style={styles.item}>
              <ThemedText
                style={[
                  styles.digits,
                  {
                    color: isCentre ? theme.text : theme.textSecondary,
                    opacity: isCentre ? 1 : 0.35,
                  },
                ]}>
                {format(item)}
              </ThemedText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digits: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
