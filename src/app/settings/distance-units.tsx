/**
 * "Distance Units" — metric or imperial, asked twice.
 *
 * Running/cycling and swimming are separate questions in the design because
 * pools are routinely measured differently from open distances: metres in the
 * pool and miles on the road is an ordinary combination, not a mistake.
 *
 * The profile only has one `units` column, though, so the swim choice has
 * nowhere of its own to go yet. Rather than silently tie the two together — the
 * onboarding screen writes both to the same answer, which makes the second
 * question look broken when it moves the first — the swim row is shown as
 * following the main choice, and says so.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { Accents, Spacing } from '@/constants/theme';
import type { UnitSystem } from '@/domain/training';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useUser } from '@/providers/user-provider';

function UnitCard({
  label,
  unit,
  selected,
  onPress,
}: {
  label: string;
  unit: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${unit}`}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? Accents.success : theme.backgroundSelected,
          backgroundColor: selected ? `${Accents.success}14` : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.cardLabel}>{label}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.cardUnit}>
        {unit}
      </ThemedText>
    </Pressable>
  );
}

export default function DistanceUnitsModal() {
  useScreenTracking('Distance units');

  const { state, update } = useUser();
  const current: UnitSystem = state.status === 'ready' ? state.user.units : 'metric';

  const [units, setUnits] = useState<UnitSystem>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await update({ units });
      router.back();
    } catch {
      setError('Could not save your distance units.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsModal
      title="Distance Units"
      icon="ruler"
      iconAccent={Accents.equipment}
      onConfirm={save}
      confirmDisabled={saving}
      error={error}>
      <View style={styles.section}>
        <ThemedText style={[styles.caption, { color: Accents.success }]}>
          Running &amp; Cycling
        </ThemedText>
        <View style={styles.row}>
          <UnitCard
            label="Metric"
            unit="km"
            selected={units === 'metric'}
            onPress={() => setUnits('metric')}
          />
          <UnitCard
            label="Imperial"
            unit="mi"
            selected={units === 'imperial'}
            onPress={() => setUnits('imperial')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.caption, { color: Accents.success }]}>Swimming</ThemedText>
        <View style={styles.row}>
          <UnitCard
            label="Metric"
            unit="m"
            selected={units === 'metric'}
            onPress={() => setUnits('metric')}
          />
          <UnitCard
            label="Imperial"
            unit="yd"
            selected={units === 'imperial'}
            onPress={() => setUnits('imperial')}
          />
        </View>
        <View style={styles.hint}>
          <Icon name="info.circle" size={13} tintColor={Accents.info} />
          <ThemedText themeColor="textSecondary" style={styles.hintText}>
            Swim units follow your main choice for now.
          </ThemedText>
        </View>
      </View>
    </SettingsModal>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  caption: {
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  card: {
    flex: 1,
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: 2,
  },
  cardLabel: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '600',
  },
  cardUnit: {
    fontSize: 12,
    lineHeight: 16,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  hintText: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
