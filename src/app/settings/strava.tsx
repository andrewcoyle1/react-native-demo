/**
 * "Strava settings" — the linked athlete, and whether Stamina renames the
 * activities it matches to a planned workout.
 *
 * Same panel shape and the same caveat as the Garmin screen: there is no Strava
 * backend here, so the identity below comes from the local store and
 * disconnecting clears only the local half.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { Accents, Spacing, Zones } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useSettings } from '@/providers/settings-provider';

/** The three disciplines shown as chips under the athlete's name. */
const DISCIPLINE_MARKS = [
  { icon: 'figure.run', accent: Zones.hard },
  { icon: 'bicycle', accent: Zones.ride },
  { icon: 'figure.pool.swim', accent: Zones.swim },
] as const;

export default function StravaModal() {
  useScreenTracking('Strava settings');

  const { state, updateIntegrations } = useSettings();
  const strava = state.status === 'ready' ? state.integrations.strava : null;

  const [error, setError] = useState<string | null>(null);

  function confirmDisconnect() {
    Alert.alert(
      'Disconnect Strava?',
      'New Strava activities will stop being matched to your planned workouts. Nothing already recorded is removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            void updateIntegrations({ strava: { connected: false } }).catch(() =>
              setError('Could not disconnect Strava.'),
            );
            router.back();
          },
        },
      ],
    );
  }

  return (
    <SettingsModal
      title="Strava settings"
      icon="bolt.fill"
      iconAccent={Zones.hard}
      layout="panel"
      error={error}>
      <View style={styles.athlete}>
        {/* A ringed initial rather than a photo: there is no Strava account to
            fetch an avatar from, and a broken image would read as a failure. */}
        <View style={[styles.avatar, { borderColor: Zones.hard }]}>
          <ThemedText style={styles.initial}>
            {strava?.athleteName?.charAt(0) ?? '?'}
          </ThemedText>
        </View>

        <View style={styles.athleteText}>
          <ThemedText style={styles.athleteName}>
            {strava?.athleteName ?? 'Not linked'}
          </ThemedText>
          {strava?.athleteHandle ? (
            <ThemedText themeColor="textSecondary" style={styles.handle}>
              {strava.athleteHandle}
            </ThemedText>
          ) : null}

          <View style={styles.marks}>
            {DISCIPLINE_MARKS.map(mark => (
              <Icon key={mark.icon} name={mark.icon} size={16} tintColor={mark.accent} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <ThemedText style={styles.switchLabel}>Rename Strava activities</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.switchHint}>
            Update linked Strava activities with planned workout info
          </ThemedText>
        </View>
        <Switch
          value={strava?.renameActivities ?? false}
          onValueChange={renameActivities => {
            setError(null);
            void updateIntegrations({ strava: { renameActivities } }).catch(() =>
              setError('Could not update your Strava settings.'),
            );
          }}
          accessibilityLabel="Rename Strava activities"
        />
      </View>

      <Pressable
        onPress={confirmDisconnect}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.danger,
          { borderColor: Accents.speed, backgroundColor: `${Accents.speed}1A` },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={[styles.dangerLabel, { color: Accents.speed }]}>
          Disconnect Strava
        </ThemedText>
      </Pressable>
    </SettingsModal>
  );
}

const styles = StyleSheet.create({
  athlete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 22,
    fontWeight: '600',
  },
  athleteText: {
    flex: 1,
    gap: 2,
  },
  athleteName: {
    fontSize: 18,
    fontWeight: '600',
  },
  handle: {
    fontSize: 14,
  },
  marks: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
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
