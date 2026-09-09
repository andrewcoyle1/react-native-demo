import { useState } from 'react';

import { ActionButton } from '@/components/action-button';
import { Card, Row, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { AuthError, useAuth } from '@/providers/auth-provider';
import { reportError, trackEvent } from '@/services/telemetry';

export default function AccountScreen() {
  useScreenTracking('Account');

  // `signOut` has to come out of the context here — it is a value on the auth
  // context object, not a module-level import. Without it in this destructure
  // the call below is an undefined identifier.
  const { user, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // (main) only mounts when a user exists; this narrows the type.
  if (!user) {
    return null;
  }

  return (
    <Screen subtitle="Your profile and preferences.">
      <Card title="Signed in as">
        <Row label="User ID" value={user.uid} />
        <Row label="Email" value={user.email ?? '—'} />
        <Row label="Anonymous" value={user.isAnonymous ? 'yes' : 'no'} />
        <Row label="Verified" value={user.emailVerified ? 'yes' : 'no'} />
      </Card>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Placeholder for the user/account view — preferences, subscription and
          profile editing belong here.
        </ThemedText>
      </Card>

      <ActionButton
        title="Sign out"
        variant="destructive"
        busy={pending}
        onPress={handleSignOut}
      />

      {/* Without this the catch above swallows every failure silently — the
          button just looks inert. Always give an error state somewhere to land. */}
      {error ? (
        <ThemedText type="small" style={{ color: '#e5484d' }} accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}
    </Screen>
  );
}
