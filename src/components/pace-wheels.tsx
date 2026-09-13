/**
 * A pace, as a minutes:seconds pair of wheels.
 *
 * Shared by onboarding's "Current fitness" step and the profile screen's run
 * and swim pace modals, which set the same two figures — so the range, the
 * zero-padding and the colon between them are defined once rather than drifting
 * apart between the two places an athlete can set a threshold.
 *
 * The value is carried as total seconds, not as a {minutes, seconds} pair: that
 * is what the domain stores, and converting at the edge keeps every caller from
 * having to reassemble it.
 */
import { StyleSheet, View } from 'react-native';

import { WheelPicker } from './onboarding/wheel-picker';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';

type PaceWheelsProps = {
  totalSeconds: number;
  onChange: (seconds: number) => void;
  /** Trails the wheels — '/km' for a run, '/100m' for a swim. */
  unit: string;
};

export function PaceWheels({ totalSeconds, onChange, unit }: PaceWheelsProps) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <View style={styles.row}>
      <WheelPicker
        min={1}
        max={20}
        value={minutes}
        onChange={value => onChange(value * 60 + seconds)}
        width={70}
      />
      <ThemedText style={styles.colon}>:</ThemedText>
      <WheelPicker
        min={0}
        max={59}
        value={seconds}
        format={value => String(value).padStart(2, '0')}
        onChange={value => onChange(minutes * 60 + value)}
        width={70}
      />
      <ThemedText themeColor="textSecondary" style={styles.unit}>
        {unit}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  colon: {
    fontSize: 28,
  },
  unit: {
    fontSize: 13,
    lineHeight: 17,
    /* Sits beside the wheels rather than on their centre line, which is where
       the design puts it. */
    marginTop: Spacing.three,
  },
});
