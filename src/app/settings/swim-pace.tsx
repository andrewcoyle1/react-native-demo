/**
 * "Swim Threshold Pace" — the same idea as the run threshold, per 100m.
 *
 * The window is 30 minutes rather than 60: a swim threshold is conventionally
 * taken from a shorter effort, and the note says so rather than leaving the
 * athlete to assume the run screen's figure applies here too.
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

/** 2:00/100m. */
const Fallback = 120;

export default function SwimPaceModal() {
  useScreenTracking('Swim threshold pace');

  const theme = useTheme();
  const { state, updateMetrics } = useSettings();
  const ready = state.status === 'ready' ? state : null;

  const [seconds, setSeconds] = useState(ready?.metrics.swimPaceSecondsPer100m ?? Fallback);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit(value: number | null) {
    setSaving(true);
    setError(null);
    try {
      await updateMetrics({ swimPaceSecondsPer100m: value });
      router.back();
    } catch {
      setError('Could not save your swim threshold pace.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsModal
      title="Swim Threshold Pace"
      icon="figure.pool.swim"
      iconAccent={Zones.swim}
      note="The fastest avg. pace you can hold for approximately 30 minutes"
      onConfirm={() => commit(seconds)}
      confirmDisabled={saving}
      error={error}>
      <PaceWheels totalSeconds={seconds} onChange={setSeconds} unit="/100m" />

      <Pressable
        onPress={() => commit(null)}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Clear swim threshold pace"
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
