/**
 * "Connect your apps" — Garmin, Strava, Wahoo, Zwift, Apple Watch, each on
 * its own brand-tinted hairline. None are wired: real integrations need each
 * platform's OAuth flow, which is future work — pressing a row says so.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Icon } from '@/components/icon';
import { StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { StatusRow } from '@/components/onboarding/status-row';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';

import { stepProgress } from './flow-order';

const Platforms = [
  { key: 'garmin', label: 'Garmin', accent: '#3B8FD6', icon: '▲', note: 'Note: Enable "Historical Data" when connecting to import past activities' },
  { key: 'strava', label: 'Strava', accent: '#FC5200', icon: '◈' },
  { key: 'wahoo', label: 'Wahoo', accent: '#3FA8CC', icon: '≫' },
  { key: 'zwift', label: 'Zwift', accent: '#FC5200', icon: 'Z' },
  { key: 'apple-watch', label: 'Apple Watch', accent: undefined, icon: '' },
] as const;

export default function ConnectAppsScreen() {
  useScreenTracking('Connect apps');
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <OnboardingStep
      title="Connect your apps"
      subtitle="Sync your workouts automatically with your preferred platforms"
      progress={stepProgress('connect-apps', true)}
      onNext={() => router.push('/notifications')}>
      <View style={styles.list}>
        {Platforms.map(platform => (
          <StatusRow
            key={platform.key}
            icon={
              platform.key === 'apple-watch' ? (
                <Icon name="applewatch" size={20} tintColor="#FFFFFF" />
              ) : (
                <ThemedText style={[styles.brandGlyph, platform.accent ? { color: platform.accent } : null]}>
                  {platform.icon}
                </ThemedText>
              )
            }
            label={platform.label}
            accent={platform.accent}
            connected={false}
            connectedLabel="Connected"
            disconnectedLabel="Not connected"
            note={'note' in platform ? platform.note : undefined}
            onPress={() => setNotice(`Connecting ${platform.label} is not wired up yet.`)}
          />
        ))}
      </View>

      {notice ? (
        <ThemedText type="small" style={styles.notice} accessibilityRole="alert">
          {notice}
        </ThemedText>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  brandGlyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  notice: {
    marginTop: 16,
    textAlign: 'center',
    color: '#E5484D',
  },
});
