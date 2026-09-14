/**
 * "Analytics" — the consent switch, and the only way tracking is ever on.
 *
 * Analytics ships opted out (see `mixpanel-analytics-service.ts`), because the
 * athlete may be in the EU or California, where consent has to be given rather
 * than assumed. This screen is where it is given, and where it is taken back:
 * choosing "Don't allow" calls Mixpanel's `optOutTracking`, which drops the
 * queued events and the stored identifier rather than merely setting a flag.
 *
 * Crash reporting is deliberately not covered here. A stack trace on a failure
 * is not behavioural tracking, and bundling the two would mean losing crash
 * reports from everyone who declines analytics.
 *
 * The wording says "linked to your account", and must keep saying something to
 * that effect. Events are keyed to the Firebase uid, carry profile properties,
 * and Mixpanel derives a coarse location from the request IP — that is
 * pseudonymous, not anonymous, and GDPR counts pseudonymous data as personal
 * data precisely because the identifier re-identifies someone. Consent has to
 * be informed to be valid, so describing this as "anonymous" would not be a
 * loose phrase, it would undermine the consent this screen exists to collect.
 * If the tracking plan ever does become identity-free, change this copy in the
 * same commit.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { Accents, Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';

function ChoiceCard({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}. ${detail}`}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? Accents.success : theme.backgroundSelected,
          backgroundColor: selected ? `${Accents.success}14` : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.cardLabel}>{label}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.cardDetail}>
        {detail}
      </ThemedText>
    </Pressable>
  );
}

export default function AnalyticsModal() {
  useScreenTracking('Analytics');

  const { consent, record } = useAnalyticsConsent();
  const [granted, setGranted] = useState(consent === 'granted');

  return (
    <SettingsModal
      title="Analytics"
      icon="chart.bar"
      iconAccent={Accents.info}
      note="Helps us see which parts of training people actually use."
      onConfirm={() => {
        record(granted ? 'granted' : 'denied');
        router.back();
      }}>
      <View style={styles.section}>
        <ChoiceCard
          label="Allow"
          detail="Share how you use the app — which screens you open and when you finish a session — linked to your account."
          selected={granted}
          onPress={() => setGranted(true)}
        />
        <ChoiceCard
          label="Don't allow"
          detail="Nothing about how you use the app is sent. Everything still works."
          selected={!granted}
          onPress={() => setGranted(false)}
        />
      </View>

      <View style={styles.hint}>
        <Icon name="info.circle" size={13} tintColor={Accents.info} />
        <ThemedText themeColor="textSecondary" style={styles.hintText}>
          We never collect your name, email, or anything you write. Crash reports are separate and
          always on, so we can fix what breaks.
        </ThemedText>
      </View>
    </SettingsModal>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
  },
  pressed: { opacity: 0.7 },
  cardLabel: { fontSize: 16, fontWeight: '600' },
  cardDetail: { fontSize: 13, lineHeight: 18 },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
