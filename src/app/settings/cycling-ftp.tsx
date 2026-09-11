/**
 * "Cycling Threshold Power (FTP)" — the single figure every power zone is a
 * percentage of.
 *
 * The zone disclosure here is the counterpart of the heart-rate screen's, and
 * uses the conventional Coggan bands. They are plain percentages of FTP, so
 * unlike the heart-rate zones there is no reserve to work from — one figure is
 * genuinely all this needs.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { WheelPicker } from '@/components/onboarding/wheel-picker';
import { Accents, Spacing, Zones } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/providers/settings-provider';

const Fallback = 200;

/** Coggan's bands, as percentages of FTP. The top one is open-ended. */
const ZONES = [
  { label: 'Z1 · Active recovery', from: 0, to: 0.55, accent: Accents.recovery },
  { label: 'Z2 · Endurance', from: 0.56, to: 0.75, accent: Accents.endurance },
  { label: 'Z3 · Tempo', from: 0.76, to: 0.9, accent: Accents.equipment },
  { label: 'Z4 · Threshold', from: 0.91, to: 1.05, accent: Accents.speed },
  { label: 'Z5 · VO₂ max', from: 1.06, to: 1.2, accent: Accents.commitment },
];

export default function CyclingFtpModal() {
  useScreenTracking('Cycling threshold power');

  const theme = useTheme();
  const { state, updateMetrics } = useSettings();
  const ready = state.status === 'ready' ? state : null;

  const [watts, setWatts] = useState(ready?.metrics.cyclingFtp ?? Fallback);
  const [zonesOpen, setZonesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit(value: number | null) {
    setSaving(true);
    setError(null);
    try {
      await updateMetrics({ cyclingFtp: value });
      router.back();
    } catch {
      setError('Could not save your threshold power.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsModal
      title="Cycling Threshold Power (FTP)"
      icon="bicycle"
      iconAccent={Zones.ride}
      note="The highest avg. power you can sustain for approximately 60 minutes"
      onConfirm={() => commit(watts)}
      confirmDisabled={saving}
      error={error}>
      <View style={styles.row}>
        {/* The column's own check constraint is 20–700W; this stays inside it
            so a valid pick can never be refused by the database. */}
        <WheelPicker min={80} max={500} value={watts} onChange={setWatts} />
        <ThemedText themeColor="textSecondary" style={styles.unit}>
          W
        </ThemedText>
      </View>

      <Pressable
        onPress={() => setZonesOpen(open => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: zonesOpen }}
        style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}>
        <Icon name={zonesOpen ? 'checkmark' : 'plus'} size={13} tintColor={theme.text} />
        <ThemedText style={styles.disclosureLabel}>View power zones</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.disclosureNote}>
          · USING DEFAULT ZONES
        </ThemedText>
      </Pressable>

      {zonesOpen ? (
        <View style={styles.zones}>
          {ZONES.map((zone, index) => (
            <View key={zone.label} style={styles.zone}>
              <View style={[styles.swatch, { backgroundColor: zone.accent }]} />
              <ThemedText style={styles.zoneLabel}>{zone.label}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.zoneRange}>
                {index === 0 ? '<' : `${Math.round(watts * zone.from)}–`}
                {Math.round(watts * zone.to)} W
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => commit(null)}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Clear threshold power"
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
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  unit: {
    fontSize: 13,
    lineHeight: 17,
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
