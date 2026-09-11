/**
 * "Heart Rate Range" — the resting and maximum figures every heart-rate zone
 * is derived from, as a pair of wheels.
 *
 * The two wheels bound each other rather than each running the full range: a
 * maximum below the minimum is not a value the athlete could mean, and the
 * table's own `athlete_metrics_hr_ordered` constraint would refuse it anyway.
 * Catching it here means the pickers simply cannot express it.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { WheelPicker } from '@/components/onboarding/wheel-picker';
import { Accents, Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/providers/settings-provider';

/** Shown when the athlete has never set a range. */
const FallbackMin = 60;
const FallbackMax = 190;

/**
 * The standard five bands, as percentages of heart-rate *reserve* — the span
 * between resting and maximum — rather than of maximum alone. That is the
 * Karvonen model, and it is why this screen asks for both figures.
 */
const ZONES = [
  { label: 'Z1 · Recovery', from: 0.5, to: 0.6, accent: Accents.recovery },
  { label: 'Z2 · Endurance', from: 0.6, to: 0.7, accent: Accents.endurance },
  { label: 'Z3 · Tempo', from: 0.7, to: 0.8, accent: Accents.equipment },
  { label: 'Z4 · Threshold', from: 0.8, to: 0.9, accent: Accents.speed },
  { label: 'Z5 · VO₂ max', from: 0.9, to: 1, accent: Accents.commitment },
];

export default function HeartRateModal() {
  useScreenTracking('Heart rate range');

  const theme = useTheme();
  const { state, updateMetrics } = useSettings();
  const ready = state.status === 'ready' ? state : null;

  const [min, setMin] = useState(ready?.metrics.heartRateMin ?? FallbackMin);
  const [max, setMax] = useState(ready?.metrics.heartRateMax ?? FallbackMax);
  const [zonesOpen, setZonesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateMetrics({ heartRateMin: min, heartRateMax: max });
      router.back();
    } catch {
      setError('Could not save your heart rate range.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsModal
      title="Heart Rate Range"
      icon="heart.fill"
      iconAccent={Accents.speed}
      onConfirm={save}
      confirmDisabled={saving}
      error={error}>
      <View style={styles.row}>
        <View style={styles.column}>
          <ThemedText themeColor="textSecondary" style={styles.header}>
            Min
          </ThemedText>
          {/* Capped one below the maximum, so the wheels can never cross. */}
          <WheelPicker min={30} max={Math.max(30, max - 1)} value={min} onChange={setMin} />
          <ThemedText themeColor="textSecondary" style={styles.unit}>
            bpm
          </ThemedText>
        </View>

        <ThemedText themeColor="textSecondary" style={styles.dash}>
          —
        </ThemedText>

        <View style={styles.column}>
          <ThemedText themeColor="textSecondary" style={styles.header}>
            Max
          </ThemedText>
          <WheelPicker min={min + 1} max={230} value={max} onChange={setMax} />
          <ThemedText themeColor="textSecondary" style={styles.unit}>
            bpm
          </ThemedText>
        </View>
      </View>

      <Pressable
        onPress={() => setZonesOpen(open => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: zonesOpen }}
        style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}>
        <Icon name={zonesOpen ? 'checkmark' : 'plus'} size={13} tintColor={theme.text} />
        <ThemedText style={styles.disclosureLabel}>View zone details</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.disclosureNote}>
          · USING DEFAULT ZONES
        </ThemedText>
      </Pressable>

      {zonesOpen ? (
        <View style={styles.zones}>
          {ZONES.map(zone => (
            <View key={zone.label} style={styles.zone}>
              <View style={[styles.swatch, { backgroundColor: zone.accent }]} />
              <ThemedText style={styles.zoneLabel}>{zone.label}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.zoneRange}>
                {band(min, max, zone.from)}–{band(min, max, zone.to)} bpm
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </SettingsModal>
  );
}

/** A fraction of heart-rate reserve, expressed as an absolute rate. */
function band(min: number, max: number, fraction: number) {
  return Math.round(min + (max - min) * fraction);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  column: {
    alignItems: 'center',
  },
  header: {
    fontSize: 13,
    lineHeight: 17,
    marginBottom: Spacing.one,
  },
  unit: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  dash: {
    fontSize: 20,
    /* Nudged onto the wheels' centre line, clear of the Min/Max captions. */
    marginTop: Spacing.four,
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  disclosureLabel: {
    fontSize: 14,
  },
  disclosureNote: {
    fontSize: 11,
    letterSpacing: 0.6,
  },
  pressed: {
    opacity: 0.6,
  },
  zones: {
    gap: Spacing.two,
  },
  zone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  zoneLabel: {
    flex: 1,
    fontSize: 14,
  },
  zoneRange: {
    fontSize: 13,
  },
});
