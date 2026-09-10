import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Card, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { AuthError, useAuth } from '@/providers/auth-provider';
import { reportError, trackEvent } from '@/services/telemetry';

type PendingAction = 'signIn' | 'signUp' | null;

export default function SignInScreen() {
  useScreenTracking('Sign in');

  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: Exclude<PendingAction, null>, work: () => Promise<unknown>) {
    setPending(action);
    setError(null);
    try {
      await work();
      trackEvent('auth_action_succeeded', { action });
      // No navigation here on purpose: signing in flips `user`, which flips the
      // guard in the root layout, and the navigator swaps to (main) by itself.
    } catch (caught) {
      const failure =
        caught instanceof AuthError
          ? caught
          : new AuthError('auth/unknown', 'Something went wrong.');
      setError(failure.message);
      reportError(caught, `auth: ${action}`);
      trackEvent('auth_action_failed', { action, code: failure.code });
    } finally {
      setPending(null);
    }
  }

  const credentialsMissing = !email.trim() || !password;

  return (
    <Screen title="Sign in" subtitle="Your notes are stored against your account.">
      <Card title="Email and password">
        <ThemedTextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <ThemedTextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          textContentType="password"
        />
        <ThemedView type="backgroundElement" style={styles.buttonRow}>
          <ActionButton
            title="Sign in"
            busy={pending === 'signIn'}
            disabled={credentialsMissing}
            onPress={() => run('signIn', () => signIn(email.trim(), password))}
          />
          <ActionButton
            title="Create account"
            variant="secondary"
            busy={pending === 'signUp'}
            disabled={credentialsMissing}
            onPress={() => run('signUp', () => signUp(email.trim(), password))}
          />
        </ThemedView>
      </Card>

      {error ? (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    gap: Spacing.two,
  },
  error: {
    color: '#e5484d',
  },
});
