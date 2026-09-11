/**
 * "Run Threshold Pace" — the pace the plan's run zones are built from.
 *
 * Carries a Clear button, unlike the heart-rate range: a threshold pace is a
 * figure an athlete can genuinely stop knowing — after a long lay-off, say —
 * and "not set" is a state the plan handles. Clearing sends an explicit null,
 * which is what distinguishes it from simply not touching the field.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { PaceWheels } from '@/components/pace-wheels';
import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Zones } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/providers/settings-provider';

/** 5:00/km — a middle-of-the-road threshold to open on. */
const Fallback = 300;

export default function RunPaceModal() {
  useScreenTracking('Run threshold pace');

  const theme = useTheme();
  const { state, updateMetrics } = useSettings();
  const ready = state.status === 'ready' ? state : null;

  const [seconds, setSeconds] = useState(ready?.metrics.runPaceSecondsPerKm ?? Fallback);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit(value: number | null) {
    setSaving(true);
    setError(null);
    try {
      await updateMetrics({ runPaceSecondsPerKm: value });
      router.back();
    } catch {
      setError('Could not save your run threshold pace.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsModal
      title="Run Threshold Pace"
      icon="figure.run"
      iconAccent={Zones.hard}
      note="The fastest avg. pace you can hold for approximately 60 minutes"
      onConfirm={() => commit(seconds)}
      confirmDisabled={saving}
      error={error}>
      <PaceWheels totalSeconds={seconds} onChange={setSeconds} unit="/km" />

      <Pressable
        onPress={() => commit(null)}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Clear run threshold pace"
        style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
        <Icon name="xmark" size={13} tintColor={theme.textSecondary} />
        <ThemedText themeColor="textSecondary" style={styles.clearLabel}>
          Clear
        </ThemedText>
      </Pressable>
    </SettingsModal>
  );
}

const styles = StyleSheet.create({
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
  },
  clearLabel: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.6,
  },
});
