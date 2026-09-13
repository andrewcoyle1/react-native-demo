/**
 * "Pool Size" — the length the swim sets are counted in.
 *
 * A segmented control rather than a wheel: there are five answers in practice,
 * and every one of them fits on a line. A wheel would imply a continuum that
 * pools do not have.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { Accents, Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { POOL_SIZES, useSettings, type PoolSize } from '@/providers/settings-provider';

export default function PoolSizeModal() {
  useScreenTracking('Pool size');

  const theme = useTheme();
  const { state, updatePreferences } = useSettings();
  const ready = state.status === 'ready' ? state : null;

  const [size, setSize] = useState<PoolSize>(ready?.preferences.poolSize ?? '25m');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updatePreferences({ poolSize: size });
      router.back();
    } catch {
      setError('Could not save your pool size.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsModal
      title="Pool Size"
      icon="arrow.left.and.right"
      iconAccent={Accents.recovery}
      onConfirm={save}
      confirmDisabled={saving}
      error={error}>
      <View style={[styles.track, { borderColor: theme.backgroundSelected }]}>
        {POOL_SIZES.map(option => {
          const active = option === size;

          return (
            <Pressable
              key={option}
              onPress={() => setSize(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option}
              style={[
                styles.cell,
                active && { backgroundColor: theme.backgroundSelected },
              ]}>
              <ThemedText
                style={[styles.label, { color: active ? theme.text : theme.textSecondary }]}>
                {/* '25m' reads as '25 M' in the design — the unit is spaced and
                    capitalised so the number carries the row. */}
                {option.replace('m', ' M').toUpperCase()}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </SettingsModal>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.one,
  },
  cell: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
