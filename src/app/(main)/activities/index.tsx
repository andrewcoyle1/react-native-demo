import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Card, Row, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { environment, flags } from '@/config/environment';
import { Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { breadcrumb, reportError, telemetry, trackEvent } from '@/services/telemetry';

export default function ActivitiesScreen() {
  useScreenTracking('Activities');

  const service = telemetry();
  const app = service.appInfo();

  const [appInstanceId, setAppInstanceId] = useState('loading…');
  const [crashedLastRun, setCrashedLastRun] = useState<boolean | null>(null);
  const [collectionEnabled, setCollectionEnabled] = useState(service.isCollectionEnabled);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    service
      .getAppInstanceId()
      .then(id => {
        if (!cancelled) {
          setAppInstanceId(id ?? 'unavailable');
        }
      })
      .catch(caught => {
        if (!cancelled) {
          setAppInstanceId('unavailable');
        }
          reportError(caught, 'telemetry: getAppInstanceId');
      });

    service
      .didCrashOnPreviousExecution()
      .then(crashed => {
        if (!cancelled) {
          setCrashedLastRun(crashed);
        }
      })
      .catch(caught => reportError(caught, 'telemetry: didCrashOnPreviousExecution'));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleCollection(next: boolean) {
    setCollectionEnabled(next);
    try {
      await service.setCollectionEnabled(next);
      setStatus(`Crash reporting ${next ? 'enabled' : 'disabled'}.`);
    } catch (caught) {
      setCollectionEnabled(!next);
      reportError(caught, 'telemetry: setCollectionEnabled');
    }
  }

  function confirmCrash() {
    Alert.alert(
      'Force a native crash?',
      'The app will terminate immediately. Reopen it to let Crashlytics upload the report.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Crash',
          style: 'destructive',
          onPress: () => {
            breadcrumb('diagnostics: user requested a test crash');
            service.crash();
          },
        },
      ],
    );
  }

  return (
    <Screen subtitle="Analytics and Crashlytics wiring.">
          <Stack.Toolbar placement="right">
            {/* Items sit horizontally in the header's trailing area, in source order. */}
            <Stack.Toolbar.Button icon="questionmark.bubble" onPress={() => router.push('/modal')} />
            <Stack.Toolbar.Button
              icon="bell"
              onPress={() => router.push('/sheet')}
            />
            <Stack.Toolbar.Button
              icon="person.crop.circle"
              onPress={() => router.push('/account')}
            />

          </Stack.Toolbar>

      <Card title="Environment">
        <Row label="Build" value={environment} />
        <Row label="Analytics collection" value={flags.analyticsEnabled ? 'on' : 'off'} />
        <Row label="Crashlytics collection" value={flags.crashlyticsEnabled ? 'on' : 'off'} />
        <Row label="Platform" value={`${Platform.OS} ${Platform.Version}`} />
      </Card>

      <Card title="Firebase app">
        <Row label="Name" value={app.name} />
        <Row label="Project" value={app.projectId} />
        <Row label="App ID" value={app.appId} />
      </Card>

      <Card title="Analytics">
        <Row label="Instance ID" value={appInstanceId} />
        <ThemedText type="small" themeColor="textSecondary">
          Events are batched on device and can take minutes to appear in the console.
          DebugView shows them immediately.
        </ThemedText>
        <ActionButton
          title="Log a test event"
          variant="secondary"
          onPress={() => {
            trackEvent('diagnostics_test_event', { source: 'diagnostics_screen' });
            setStatus('Logged `diagnostics_test_event`.');
          }}
        />
      </Card>

      <Card title="Crashlytics">
        <Row
          label="Crashed last run"
          value={crashedLastRun === null ? 'checking…' : crashedLastRun ? 'yes' : 'no'}
        />
        <ThemedView type="backgroundElement" style={styles.switchRow}>
          <ThemedText type="small">Collection enabled</ThemedText>
          <Switch value={collectionEnabled} onValueChange={toggleCollection} />
        </ThemedView>
        <ActionButton
          title="Record a non-fatal error"
          variant="secondary"
          onPress={() => {
            reportError(new Error('Diagnostics test error'), 'diagnostics: manual non-fatal');
            setStatus('Recorded a non-fatal error.');
          }}
        />
        <ActionButton title="Force a crash" variant="destructive" onPress={confirmCrash} />
        <ThemedText type="small" themeColor="textSecondary">
          `expo-dev-client` intercepts native crashes with its own error overlay, so
          forced crashes are only reported in a build without it.
        </ThemedText>
      </Card>

      {status ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityRole="alert">
          {status}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
});
