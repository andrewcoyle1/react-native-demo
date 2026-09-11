/**
 * "Garmin settings" — what gets pushed to the watch, and what it is asked to
 * target.
 *
 * A panel rather than a dialog: nothing here is an edit waiting to be confirmed
 * — each control takes effect as it is touched — so a Done button would have
 * nothing to do. Closing is the only exit it needs.
 *
 * There is no Garmin backend behind this. `SettingsService` says as much, and
 * the switches write to the local store so the screen is real and reviewable;
 * disconnecting is the one action that cannot honestly be faked, so it says
 * what it will do and then does the local half of it.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { Accents, Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import {
  useSettings,
  type CyclingMetric,
  type RunningMetric,
} from '@/providers/settings-provider';

const CYCLING_LABELS: Record<CyclingMetric, string> = {
  watts: 'Watts',
  heartRate: 'Heart rate',
};
const RUNNING_LABELS: Record<RunningMetric, string> = {
  pace: 'Pace',
  heartRate: 'Heart rate',
};

export default function GarminModal() {
  useScreenTracking('Garmin settings');

  const theme = useTheme();
  const { state, updateIntegrations } = useSettings();
  const garmin = state.status === 'ready' ? state.integrations.garmin : null;

  const [error, setError] = useState<string | null>(null);

  async function change(changes: Parameters<typeof updateIntegrations>[0]['garmin']) {
    setError(null);
    try {
      await updateIntegrations({ garmin: changes });
    } catch {
      setError('Could not update your Garmin settings.');
    }
  }

  function confirmDisconnect() {
    Alert.alert(
      'Disconnect Garmin?',
      'Planned workouts will stop being sent to your Garmin calendar. Activities already recorded are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            void change({ connected: false });
            router.back();
          },
        },
      ],
    );
  }

  return (
    <SettingsModal
      title="Garmin settings"
      icon="triangle.fill"
      iconAccent={Accents.recovery}
      layout="panel"
      error={error}>
      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <ThemedText style={styles.switchLabel}>Auto-send workouts to Garmin</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.switchHint}>
            Push each week&apos;s planned workouts to your Garmin calendar automatically and keep
            it updated when your plan changes
          </ThemedText>
        </View>
        <Switch
          value={garmin?.autoSend ?? false}
          onValueChange={autoSend => void change({ autoSend })}
          accessibilityLabel="Auto-send workouts to Garmin"
        />
      </View>

      <MetricRow
        section="Cycling"
        icon="bolt.fill"
        accent={Accents.commitment}
        label="Target cycling metric"
        value={CYCLING_LABELS[garmin?.cyclingMetric ?? 'watts']}
        onPress={() =>
          void change({
            cyclingMetric: garmin?.cyclingMetric === 'watts' ? 'heartRate' : 'watts',
          })
        }
      />

      <MetricRow
        section="Running"
        icon="gauge.with.dots.needle.bottom.50percent"
        accent={theme.textSecondary}
        label="Target running metric"
        value={RUNNING_LABELS[garmin?.runningMetric ?? 'pace']}
        onPress={() =>
          void change({ runningMetric: garmin?.runningMetric === 'pace' ? 'heartRate' : 'pace' })
        }
      />

      <Pressable
        onPress={confirmDisconnect}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.danger,
          { borderColor: Accents.speed, backgroundColor: `${Accents.speed}1A` },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={[styles.dangerLabel, { color: Accents.speed }]}>
          Disconnect Garmin
        </ThemedText>
      </Pressable>
    </SettingsModal>
  );
}

/**
 * One "target metric" row. Tapping cycles between the two choices rather than
 * pushing another screen: there are exactly two, and a whole route for a binary
 * is more chrome than the choice deserves.
 */
function MetricRow({
  section,
  icon,
  accent,
  label,
  value,
  onPress,
}: {
  section: string;
  icon: 'bolt.fill' | 'gauge.with.dots.needle.bottom.50percent';
  accent: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.metricSection}>
      <ThemedText themeColor="textSecondary" style={styles.sectionLabel}>
        {section.toUpperCase()}
      </ThemedText>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        style={({ pressed }) => [styles.metricRow, pressed && styles.pressed]}>
        <Icon name={icon} size={20} tintColor={accent} />
        <View style={styles.metricText}>
          <ThemedText style={styles.metricLabel}>{label}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.metricValue}>
            {value}
          </ThemedText>
        </View>
        <Icon name="chevron.right" size={14} tintColor={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
    gap: Spacing.one,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricSection: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  metricText: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 16,
  },
  metricValue: {
    fontSize: 13,
  },
  danger: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
