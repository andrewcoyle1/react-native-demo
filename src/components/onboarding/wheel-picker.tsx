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
 * stops exactly on a value.
 *
 * Reading the landed value takes *both* scroll-end events, which is the whole
 * subtlety here. `onMomentumScrollEnd` fires only when the release had enough
 * velocity to coast; turn the wheel slowly and let go and no momentum follows,
 * so listening to that alone means a gentle drag commits nothing and the wheel
 * springs back to where it started. `onScrollEndDrag` covers exactly that case.
 */
import { useEffect, useMemo, useRef } from 'react';
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

  const scroller = useRef<ScrollView>(null);
  /*
   * The last index this wheel itself settled on.
   *
   * It is what tells an incoming `value` apart from one this wheel just
   * reported. Without it the effect below would fight the user: every turn
   * reports a value, the parent re-renders with it, and the effect would scroll
   * the wheel back to where it already is mid-gesture.
   */
  const settled = useRef(index);

  useEffect(() => {
    if (index === settled.current) {
      return;
    }

    // Changed from outside — a Clear button, or the other half of a bounded
    // pair shifting this one's range. Move to match; `contentOffset` only ever
    // sets the starting position, so it cannot do this.
    settled.current = index;
    scroller.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
  }, [index]);

  function commit(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const rounded = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, rounded));
    const picked = values[clamped];

    if (picked === undefined || picked === value) {
      return;
    }

    settled.current = clamped;
    onChange(picked);
  }

  /**
   * Commits only when the release will not coast.
   *
   * A flick still belongs to `onMomentumScrollEnd`, which sees where it
   * actually stopped; committing here as well would report the value under the
   * finger and then correct it a moment later. Android does not report
   * `velocity` at all, so an absent reading is treated as a standstill — which
   * is right, because there `onScrollEndDrag` is the only one of the two that
   * is guaranteed to arrive.
   */
  function handleDragEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const velocity = event.nativeEvent.velocity?.y;

    if (velocity === undefined || Math.abs(velocity) < 0.1) {
      commit(event);
    }
  }

  return (
    <View style={[styles.wrap, { width, height: ITEM_HEIGHT * (1 + 2 * VISIBLE_NEIGHBOURS) }]}>
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: index * ITEM_HEIGHT }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * VISIBLE_NEIGHBOURS }}
        onScrollEndDrag={handleDragEnd}
        onMomentumScrollEnd={commit}>
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
