/**
 * The distance slider under each ability screen's "Can't swim yet" / "Less
 * than 3km" line: a track with a small pill handle, snapping to one of a
 * fixed set of labelled steps rather than a continuous value.
 *
 * Built on `PanResponder` rather than a gesture library — a single
 * one-dimensional drag needs nothing more, and it keeps this file dependency
 * -free.
 */
import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function DiscreteSlider({
  stepCount,
  index,
  onChange,
}: {
  stepCount: number;
  index: number;
  onChange: (index: number) => void;
}) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const HANDLE = 44;

  // A ref would need reading `.current` during render to spread its
  // `panHandlers`, which the React Compiler forbids; `useMemo` gives the same
  // "create once" behaviour as a plain value instead.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_event, gesture) => {
          if (trackWidth <= HANDLE) return;
          const usable = trackWidth - HANDLE;
          const x = Math.max(0, Math.min(usable, gesture.moveX - HANDLE / 2));
          const step = Math.round((x / usable) * (stepCount - 1));
          onChange(Math.max(0, Math.min(stepCount - 1, step)));
        },
      }),
    [trackWidth, stepCount, onChange],
  );

  const usable = Math.max(0, trackWidth - HANDLE);
  const offset = stepCount > 1 ? (index / (stepCount - 1)) * usable : 0;

  return (
    <View
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
      onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
      {...panResponder.panHandlers}>
      <View
        style={[
          styles.handle,
          { width: HANDLE, left: offset, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
        ]}>
        <View style={styles.dots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    justifyContent: 'center',
  },
  handle: {
    position: 'absolute',
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
  },
});
