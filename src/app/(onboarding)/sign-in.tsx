/**
 * Signing in.
 *
 * Geometry measured from the design at 440pt: 54pt fields 16pt apart, the
 * action 50pt tall, provider buttons 47pt on a hairline.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthFaceIdAccessory } from '@/components/auth-button';
import { AuthTextField } from '@/components/auth-field';
import { AuthProviders } from '@/components/auth-providers';
import { AuthFooterLink, AuthScreen } from '@/components/auth-screen';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { AuthError, useAuth } from '@/providers/auth-provider';
import { reportError, trackEvent } from '@/services/telemetry';

export default function SignInScreen() {
  useScreenTracking('Sign in');

  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);

    try {
      await signIn(email.trim(), password);
      trackEvent('auth_action_succeeded', { action: 'signIn' });
      // No navigation: signing in flips `user`, which flips the root gate.
    } catch (caught) {
      const failure =
        caught instanceof AuthError ? caught : new AuthError('auth/unknown', 'Something went wrong.');
      setError(failure.message);
      reportError(caught, 'auth: signIn');
      trackEvent('auth_action_failed', { action: 'signIn', code: failure.code });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Sign In"
      footer={
        <AuthFooterLink
          question="Don't have an account?"
          action="Sign up"
          onPress={() => router.replace('/sign-up')}
        />
      }>
      {/* The design's two voids, weighted so they keep their proportions on a
          shorter phone: 141 above the fields, 113 under the providers. */}
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
          placeholder="Password"
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>

      <ThemedText
        themeColor="textSecondary"
        style={styles.forgot}
        onPress={() =>
          setError('Password reset needs email delivery, which is not set up yet.')
        }>
        Forgot your password?
      </ThemedText>

      <AuthButton
        title="Sign In"
        busy={busy}
        disabled={!email.trim() || !password}
        onPress={submit}
        style={styles.action}
        accessory={
          <AuthFaceIdAccessory
            onPress={() => setError('Face ID sign-in is not wired up yet.')}
          />
        }
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
              `Sign in with ${provider === 'apple' ? 'Apple' : 'Google'} is not wired up yet.`,
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
    flex: 141,
    minHeight: 24,
  },
  voidBelow: {
    flex: 113,
    minHeight: 24,
  },
  fields: {
    gap: 16,
  },
  forgot: {
    marginTop: 15,
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    marginTop: 38,
  },
  error: {
    marginTop: 16,
    textAlign: 'center',
    color: '#E5484D',
  },
  providers: {
    marginTop: 25,
  },
});
