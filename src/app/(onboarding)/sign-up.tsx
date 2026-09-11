/**
 * Creating an account.
 *
 * The same shell as signing in, with the password minimum stated in the field
 * rather than discovered by being rejected — the server's rule is eight
 * characters, and the placeholder says so.
 *
 * The design gives this screen no footer link back to sign-in — unlike the
 * sign-in screen, which links forward to sign-up — so the back arrow is the
 * only way back, and the space below the provider buttons is one long void.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { AuthTextField } from '@/components/auth-field';
import { AuthProviders } from '@/components/auth-providers';
import { AuthScreen } from '@/components/auth-screen';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { AuthError, useAuth } from '@/providers/auth-provider';
import { reportError, trackEvent } from '@/services/telemetry';

/** Matches the server's rule, so the field can say it up front. */
const PASSWORD_MIN = 8;

export default function SignUpScreen() {
  useScreenTracking('Sign up');

  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);

    try {
      await signUp(email.trim(), password);
      trackEvent('auth_action_succeeded', { action: 'signUp' });
    } catch (caught) {
      const failure =
        caught instanceof AuthError ? caught : new AuthError('auth/unknown', 'Something went wrong.');
      setError(failure.message);
      reportError(caught, 'auth: signUp');
      trackEvent('auth_action_failed', { action: 'signUp', code: failure.code });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen title="Create a new account">
      <View style={styles.voidAbove} />

      <View style={styles.fields}>
        <AuthTextField
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <AuthTextField
          secure
          value={password}
          onChangeText={setPassword}
          placeholder={`Password (minimum ${PASSWORD_MIN} characters)`}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>

      <AuthButton
        title="Sign Up"
        busy={busy}
        disabled={!email.trim() || password.length < PASSWORD_MIN}
        onPress={submit}
        style={styles.action}
      />

      {error ? (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.providers}>
        <AuthProviders
          onPress={provider =>
            setError(
              `Sign up with ${provider === 'apple' ? 'Apple' : 'Google'} is not wired up yet.`,
            )
          }
        />
      </View>

      <View style={styles.voidBelow} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  voidAbove: {
    flex: 99,
    minHeight: 24,
  },
  voidBelow: {
    flex: 390,
    minHeight: 24,
  },
  fields: {
    gap: 16,
  },
  action: {
    marginTop: 65,
  },
  error: {
    marginTop: 16,
    textAlign: 'center',
    color: '#E5484D',
  },
  providers: {
    marginTop: 34,
  },
});
