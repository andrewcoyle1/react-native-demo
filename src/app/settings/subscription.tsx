/**
 * "Subscription" — the trial's state, and the two things an athlete can do
 * about it.
 *
 * There is no billing backend behind this repo, and rather than mock a purchase
 * flow that would be indistinguishable from a real one, both buttons say
 * plainly that the store is not connected yet. A fake "Subscribed!" is the one
 * outcome this screen must never show.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useSettings } from '@/providers/settings-provider';

/** The trial card's sweep, sampled from the design. */
const TrialFill = 'linear-gradient(100deg, #5B3A42 0%, #352D55 50%, #112A54 100%)';
const TrialStroke = 'linear-gradient(100deg, #E28CB4 0%, #817CE3 50%, #3472E4 100%)';

function formatEnds(at: Date | null) {
  if (!at) {
    return 'No trial running';
  }

  return `Trial ends ${at.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} at ${at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export default function SubscriptionModal() {
  useScreenTracking('Subscription');

  const { state } = useSettings();
  const subscription = state.status === 'ready' ? state.subscription : null;

  const [busy, setBusy] = useState(false);

  function notWired(action: string) {
    setBusy(true);
    Alert.alert(
      `${action} is not available yet`,
      'Stamina is not connected to the App Store in this build, so there is nothing to charge or restore. This screen is here so the flow can be reviewed.',
      [{ text: 'OK', onPress: () => setBusy(false) }],
    );
  }

  return (
    <SettingsModal title="Subscription" layout="panel">
      <View style={styles.card}>
        {/* The stroke is a gradient too, so it is drawn as a filled backing with
            the card inset over it rather than as a border colour. */}
        <View style={[styles.cardStroke, { experimental_backgroundImage: TrialStroke }]}>
          <View style={[styles.cardFill, { experimental_backgroundImage: TrialFill }]}>
            <ThemedText style={styles.cardTitle}>
              {subscription?.active ? 'Full access' : 'Full access free trial'}
            </ThemedText>
            <ThemedText style={styles.cardSub}>
              {subscription?.active ? 'Your subscription is active' : formatEnds(subscription?.trialEndsAt ?? null)}
            </ThemedText>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => notWired('Subscribing')}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [styles.subscribe, pressed && styles.pressed]}>
        <ThemedText style={styles.subscribeLabel}>Subscribe now</ThemedText>
      </Pressable>

      <View style={styles.footer}>
        <Pressable
          onPress={() => notWired('Restoring purchases')}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <ThemedText themeColor="textSecondary" style={styles.actionLabel}>
            Restore Purchases
          </ThemedText>
        </Pressable>
      </View>
    </SettingsModal>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.two,
  },
  cardStroke: {
    borderRadius: Spacing.three,
    padding: 1,
  },
  cardFill: {
    borderRadius: Spacing.three - 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardSub: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.72)',
  },
  subscribe: {
    /* White on the blurred ground, as the design has it — the one button on
       this screen that is meant to be unmissable. */
    backgroundColor: '#FAFAFA',
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  subscribeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  footer: {
    alignItems: 'center',
  },
  action: {
    paddingVertical: Spacing.two,
  },
  actionLabel: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.6,
  },
});
