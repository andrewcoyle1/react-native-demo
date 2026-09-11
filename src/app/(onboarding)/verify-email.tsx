/**
 * The 6-digit code sent after sign-up.
 *
 * Uses `AuthScreen`, not `OnboardingStep` — the design gives it the same full
 * arrow and no progress bar as sign-in/sign-up, because it is still part of
 * account creation rather than the personalisation flow that follows it.
 *
 * Not wired to a real code yet: the server does not send one, so `verify`
 * always reports the same "not set up yet" message sign-in's "Forgot your
 * password?" already uses for the same reason. Reachable today only by direct
 * navigation — signing up still flips `user` and drops straight into
 * `(main)`, since the auth gate has no notion of "verified but not onboarded"
 * to hold it back.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { AuthTextField } from '@/components/auth-field';
import { AuthScreen } from '@/components/auth-screen';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';

export default function VerifyEmailScreen() {
  useScreenTracking('Verify email');

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError('Email verification is not set up yet.');
  }

  return (
    <AuthScreen title="Verify your email">
      <View style={styles.spacer} />

      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Check your email for a 6-digit verification code
      </ThemedText>

      <AuthTextField
        value={code}
        onChangeText={setCode}
        placeholder="Verification Code"
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <AuthButton
        title="Verify Email"
        disabled={code.length !== 6}
        onPress={submit}
        style={styles.action}
      />

      {error ? (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.spacer} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  subtitle: {
    marginTop: -8,
    marginBottom: 32,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
  },
  action: {
    marginTop: 32,
  },
  error: {
    marginTop: 16,
    textAlign: 'center',
    color: '#E5484D',
  },
});
