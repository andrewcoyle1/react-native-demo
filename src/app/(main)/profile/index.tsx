import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Icon } from '@/components/icon';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ProfileCard } from '@/components/profile-card';
import { Screen } from '@/components/screen';
import { SettingsGroup } from '@/components/settings-group';
import { SettingsRow } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accents, ActivePlanAccent, Spacing, Zones } from '@/constants/theme';
import type { UnitSystem } from '@/domain/training';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import {
  formatRaceDate,
  formatRaceTarget,
  toRaceTargets,
} from '@/presenters/plan-presenter';
import { AuthError, useAuth } from '@/providers/auth-provider';
import { useSettings, type PoolSize } from '@/providers/settings-provider';
import { useTraining } from '@/providers/training-provider';
import { useUser } from '@/providers/user-provider';
import { reportError, trackEvent } from '@/services/telemetry';

type Social = { id: string; icon: SFSymbol; gradient: string; label: string; url: string };

/**
 * Brand marks are not in SF Symbols, so these stand in with the nearest
 * available glyph. Swap for real artwork when the brand assets land.
 */
const SOCIALS: Social[] = [
  { id: 'web', icon: 'globe', gradient: 'linear-gradient(140deg, #2E5C8A, #1D3A57)', label: 'Website', url: 'https://example.com' },
  { id: 'instagram', icon: 'camera', gradient: 'linear-gradient(140deg, #F9CE34, #EE2A7B 55%, #6228D7)', label: 'Instagram', url: 'https://instagram.com' },
  { id: 'tiktok', icon: 'music.note', gradient: 'linear-gradient(140deg, #25F4EE, #111111 55%, #FE2C55)', label: 'TikTok', url: 'https://tiktok.com' },
  { id: 'youtube', icon: 'play.rectangle', gradient: 'linear-gradient(140deg, #FF4E45, #C4302B)', label: 'YouTube', url: 'https://youtube.com' },
  { id: 'strava', icon: 'bolt', gradient: 'linear-gradient(140deg, #FC5200, #8A2F00)', label: 'Strava', url: 'https://strava.com' },
];

/** "andrew.coyle99@example.com" -> "Andrew Coyle". Until a profile document exists. */
function nameFromEmail(email: string | null) {
  const local = (email ?? '')
    .split('@')[0]
    .replace(/\d+/g, '')
    .replace(/[._-]+/g, ' ')
    .trim();

  if (!local) {
    return 'Athlete';
  }

  return local
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * How each figure reads on its row.
 *
 * "Not set" rather than a blank or a zero: the rows are the only place an
 * athlete sees which thresholds the plan is missing, and a dash would not say
 * that the value is *askable*. Every one of these is nullable for that reason.
 */
function formatHeartRate(min: number | null, max: number | null) {
  return min !== null && max !== null ? `${min} - ${max} bpm` : 'Not set';
}

/** Seconds to 'm:ss', with the unit the discipline is measured in. */
function formatPace(seconds: number | null, unit: string) {
  if (seconds === null) {
    return 'Not set';
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, '0')}${unit}`;
}

/** The calendar row's third line. Absent rather than "never" when unknown. */
function formatSynced(at: Date | null) {
  if (!at) {
    return undefined;
  }

  const day = at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `Last synced: ${day} at ${time}`;
}

function formatUnits(units: UnitSystem) {
  return units === 'metric' ? 'Metric (km, m)' : 'Imperial (mi, yd)';
}

/** '25m' -> '25 m'. The stored value is compact; the row is not. */
function formatPoolSize(size: PoolSize) {
  return size.replace('m', ' m');
}

export default function ProfileScreen() {
  useScreenTracking('Profile');

  const { user, signOut, deleteAccount } = useAuth();
  const { state } = useUser();
  const { races, resetPlans } = useTraining();
  const { state: settings } = useSettings();

  // Every settings row reads from this; until it resolves they show "Not set",
  // which is also what they show for a figure the athlete has never given.
  const metrics = settings.status === 'ready' ? settings.metrics : null;
  const preferences = settings.status === 'ready' ? settings.preferences : null;
  const integrations = settings.status === 'ready' ? settings.integrations : null;

  // The goal race is the A race: the one the plans build towards.
  const race =
    races.status === 'ready' ? (races.data.find(item => item.priority === 'A') ?? null) : null;

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [dangerError, setDangerError] = useState<string | null>(null);

  // The profile provider is the name's home; auth only knows an email, so that
  // is the fallback rather than the source. It reads as a name rather than as a
  // login, which is the point of not showing the raw local part.
  const name = state.status === 'ready' ? state.user.name : nameFromEmail(user?.email ?? null);

  const version = Constants.expoConfig?.version ?? '—';

  async function handleSignOut() {
    setPending(true);
    setError(null);
    try {
      await signOut();
      trackEvent('auth_action_succeeded', { action: 'signOut' });
      // No navigation needed: clearing `user` flips the root guard, which returns
      // the navigator to the onboarding flow.
    } catch (caught) {
      const failure =
        caught instanceof AuthError
          ? caught
          : new AuthError('auth/unknown', 'Something went wrong.');
      setError(failure.message);
      reportError(caught, 'auth: signOut');
      trackEvent('auth_action_failed', { action: 'signOut', code: failure.code });
    } finally {
      setPending(false);
    }
  }

  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch (caught) {
      reportError(caught, 'profile: openURL');
    }
  }

  function confirmResetPlans() {
    Alert.alert(
      'Reset Training Plans?',
      'This deletes your current and upcoming plans and every session in them. Your races and completed activities are not affected. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: handleResetPlans },
      ],
    );
  }

  async function handleResetPlans() {
    setResetPending(true);
    setDangerError(null);
    try {
      await resetPlans();
      trackEvent('account_action_succeeded', { action: 'resetPlans' });
      Alert.alert('Training plans reset', 'Head to the Plan tab to generate a new one.');
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Something went wrong. Please try again.';
      setDangerError(message);
      reportError(caught, 'training: resetPlans');
      trackEvent('account_action_failed', { action: 'resetPlans' });
    } finally {
      setResetPending(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete Account?',
      'This permanently deletes your account and every piece of data attached to it — your plans, sessions, activities and races. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteAccount },
      ],
    );
  }

  async function handleDeleteAccount() {
    setDeletePending(true);
    setDangerError(null);
    try {
      await deleteAccount();
      trackEvent('account_action_succeeded', { action: 'deleteAccount' });
      // No navigation needed: clearing `user` flips the root guard, exactly as
      // signing out does — the account this screen belongs to no longer exists.
    } catch (caught) {
      const failure =
        caught instanceof AuthError
          ? caught
          : new AuthError('auth/unknown', 'Something went wrong.');
      setDangerError(failure.message);
      reportError(caught, 'auth: deleteAccount');
      trackEvent('account_action_failed', { action: 'deleteAccount', code: failure.code });
    } finally {
      setDeletePending(false);
    }
  }

  // (main) only mounts when a user exists; this narrows the type.
  if (!user) {
    return null;
  }

  return (
    <Screen>
      {/* Only rendered once the goal race is known: the card is entirely about
          that race, so there is nothing to show in its place. */}
      {race ? (
        <ProfileCard
          name={name}
          race={race.name}
          place={race.place}
          date={formatRaceDate(race)}
          target={formatRaceTarget(race) ?? 'No goal set'}
          targets={toRaceTargets(race, 'metric')}
          artwork={race.artworkUrl ?? undefined}
        />
      ) : null}

      <SettingsGroup label="Fitness metrics">
        <SettingsRow
          icon="heart.fill"
          iconAccent={Accents.speed}
          title="Heart Rate Range"
          subtitle={formatHeartRate(metrics?.heartRateMin ?? null, metrics?.heartRateMax ?? null)}
          onPress={() => router.push('/settings/heart-rate')}
        />
        <SettingsRow
          icon="figure.run"
          iconAccent={Zones.hard}
          title="Run Threshold Pace"
          subtitle={formatPace(metrics?.runPaceSecondsPerKm ?? null, '/km')}
          onPress={() => router.push('/settings/run-pace')}
        />
        <SettingsRow
          icon="bicycle"
          iconAccent={Zones.ride}
          title="Cycling Threshold Power (FTP)"
          subtitle={metrics?.cyclingFtp !== null && metrics?.cyclingFtp !== undefined
            ? `${metrics.cyclingFtp} W`
            : 'Not set'}
          onPress={() => router.push('/settings/cycling-ftp')}
        />
        <SettingsRow
          icon="figure.pool.swim"
          iconAccent={Zones.swim}
          title="Swim Threshold Pace"
          subtitle={formatPace(metrics?.swimPaceSecondsPer100m ?? null, '/100m')}
          onPress={() => router.push('/settings/swim-pace')}
        />
      </SettingsGroup>

      <SettingsGroup label="Preferences">
        <SettingsRow
          icon="ruler"
          iconAccent={Accents.equipment}
          title="Distance Units"
          subtitle={formatUnits(state.status === 'ready' ? state.user.units : 'metric')}
          onPress={() => router.push('/settings/distance-units')}
        />
        <SettingsRow
          icon="arrow.left.and.right"
          iconAccent={Accents.recovery}
          title="Pool Size"
          subtitle={preferences ? formatPoolSize(preferences.poolSize) : 'Not set'}
          onPress={() => router.push('/settings/pool-size')}
        />
        <SettingsRow
          icon="calendar"
          iconAccent={Accents.schedule}
          title="Availability"
          subtitle="Change your preferred training days"
          onPress={() => router.push('/settings/availability')}
        />
      </SettingsGroup>

      <SettingsGroup label="Connected apps & devices">
        <SettingsRow
          icon="triangle.fill"
          iconAccent={Accents.recovery}
          title="Garmin Connect"
          subtitle={integrations?.garmin.connected ? 'Connected' : 'Not connected'}
          subtitleAccent={integrations?.garmin.connected ? Accents.endurance : undefined}
          onPress={() => router.push('/settings/garmin')}
        />
        <SettingsRow
          icon="bolt.fill"
          iconAccent={Zones.hard}
          title="Strava"
          subtitle={integrations?.strava.connected ? 'Connected' : 'Not connected'}
          subtitleAccent={integrations?.strava.connected ? Accents.endurance : undefined}
          onPress={() => router.push('/settings/strava')}
        />
        <SettingsRow icon="wave.3.right" title="Wahoo" subtitle="Not connected" />
        <SettingsRow icon="figure.indoor.cycle" title="Zwift" subtitle="Not connected" />
        <SettingsRow icon="applewatch" title="Apple Watch" subtitle="Not connected" />
        <SettingsRow
          icon="calendar"
          iconAccent={Accents.schedule}
          title="Calendar"
          subtitle={integrations?.calendar.connected ? 'Connected' : 'Not connected'}
          subtitleAccent={integrations?.calendar.connected ? Accents.endurance : undefined}
          caption={formatSynced(integrations?.calendar.lastSyncedAt ?? null)}
          onPress={() => router.push('/settings/calendar-sync')}
        />
      </SettingsGroup>

      <SettingsGroup label="Other login options">
        <SettingsRow
          icon="apple.logo"
          title="Apple Account"
          subtitle="Linked"
          subtitleAccent={Accents.endurance}
          subtitleTrailing={` - ${user.email ?? 'unknown'}`}
        />
        <SettingsRow icon="g.circle.fill" title="Google Account" subtitle="Not linked" />
      </SettingsGroup>

      <SettingsGroup label="Manage subscription">
        <SettingsRow
          icon="info.circle"
          iconAccent={Accents.recovery}
          title="Manage Subscription"
          subtitle="Manage your subscription"
          onPress={() => router.push('/settings/subscription')}
        />
        <SettingsRow
          icon="ticket"
          iconAccent={Accents.schedule}
          title="Redeem Referral Code"
          subtitle="Enter a referral code"
          onPress={() => router.push('/settings/redeem-code')}
        />
      </SettingsGroup>

      <SettingsGroup label="Misc">
        <SettingsRow
          icon="play.circle"
          iconAccent={ActivePlanAccent}
          title="Meet Your Coaches"
          subtitle="Watch coach introductions"
        />
        <SettingsRow
          icon="star.circle"
          iconAccent={Accents.info}
          title="Leave a Review"
          subtitle="Rate Stamina on the App Store"
        />
      </SettingsGroup>

      <SettingsGroup label="Notifications">
        <SettingsRow
          icon="bell.fill"
          iconAccent={Accents.equipment}
          title="Enable Push Notifications"
          subtitle="Get notified when planned workouts are completed"
          status="Enabled"
          statusAccent={Accents.endurance}
          statusDot
          chevron={false}
        />
      </SettingsGroup>

      <SettingsGroup label="Account">
        <SettingsRow
          icon="rectangle.portrait.and.arrow.right"
          title={pending ? 'Signing out…' : 'Log Out'}
          subtitle="Sign out of your account"
          onPress={pending ? undefined : handleSignOut}
        />
      </SettingsGroup>

      {/* Without this the catch above swallows every failure silently — the
          row just looks inert. Always give an error state somewhere to land. */}
      {error ? (
        <ThemedText style={[styles.error, { color: Accents.speed }]} accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.socials}>
        {SOCIALS.map(social => (
          <Pressable
            key={social.id}
            onPress={() => open(social.url)}
            accessibilityRole="link"
            accessibilityLabel={social.label}
            style={({ pressed }) => [
              styles.social,
              { experimental_backgroundImage: social.gradient },
              pressed && styles.pressed,
            ]}>
            <Icon name={social.icon} size={20} tintColor="#FFFFFF" />
          </Pressable>
        ))}
      </View>

      <View style={styles.legal}>
        <Pressable onPress={() => open('https://example.com/terms')} accessibilityRole="link">
          <ThemedText style={styles.legalLink}>Terms &amp; Conditions</ThemedText>
        </Pressable>
        <Pressable onPress={() => open('https://example.com/privacy')} accessibilityRole="link">
          <ThemedText style={styles.legalLink}>Privacy Policy</ThemedText>
        </Pressable>
        <ThemedText themeColor="textSecondary" style={styles.company}>
          STAMINA TECHNOLOGIES LIMITED
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.company}>
          v{version}
        </ThemedText>
      </View>

      {/* Collapsed by default: everything inside is irreversible, so it takes a
          deliberate act to even see it. */}
      <ThemedView style={styles.danger}>
        <Pressable
          onPress={() => setDangerOpen(open => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: dangerOpen }}
          accessibilityLabel="Danger zone"
          style={({ pressed }) => [styles.dangerHeader, pressed && styles.pressed]}>
          <ThemedText style={[styles.dangerLabel, { color: Accents.speed }]}>
            DANGER ZONE
          </ThemedText>
          <Icon
            name="chevron.down"
            size={16}
            tintColor={Accents.speed}
            style={dangerOpen ? styles.chevronUp : undefined}
          />
        </Pressable>

        {dangerOpen ? (
          <SettingsGroup>
            <SettingsRow
              icon="exclamationmark.circle"
              iconAccent={Accents.equipment}
              accent={Accents.equipment}
              title={resetPending ? 'Resetting…' : 'Reset Training Plans'}
              subtitle="Resets your training plans so a new one can be generated. Cannot be undone."
              onPress={resetPending || deletePending ? undefined : confirmResetPlans}
            />
            <SettingsRow
              icon="exclamationmark.circle"
              iconAccent={Accents.speed}
              accent={Accents.speed}
              title={deletePending ? 'Deleting…' : 'Delete Account'}
              subtitle="Permanently delete your account and all your data. Cannot be undone."
              onPress={resetPending || deletePending ? undefined : confirmDeleteAccount}
            />
          </SettingsGroup>
        ) : null}

        {dangerError ? (
          <ThemedText style={[styles.error, { color: Accents.speed }]} accessibilityRole="alert">
            {dangerError}
          </ThemedText>
        ) : null}
      </ThemedView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    fontSize: 14,
  },
  socials: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  social: {
    width: 52,
    height: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  legal: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  legalLink: {
    fontSize: 15,
  },
  company: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  danger: {
    gap: Spacing.three,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dangerLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  chevronUp: {
    transform: [{ rotate: '180deg' }],
  },
});
