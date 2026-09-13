/**
 * "Redeem Code" — a referral code, and the one button that takes it.
 *
 * Redeem stays disabled until something has been typed, so the only failure the
 * athlete can reach is a code the service actually rejects. With no billing
 * backend wired up that is every code, and the message says so rather than
 * pretending the code was wrong.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { SettingsModal } from '@/components/settings-modal';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Accents, Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/providers/settings-provider';

export default function RedeemCodeModal() {
  useScreenTracking('Redeem code');

  const theme = useTheme();
  const { redeemCode } = useSettings();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeem() {
    setBusy(true);
    setError(null);
    try {
      await redeemCode(code);
      router.back();
    } catch {
      setError('Referral codes are not available in this build yet.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsModal
      title="Redeem Code"
      icon="ticket"
      iconAccent={Accents.schedule}
      confirmLabel="Redeem"
      onConfirm={redeem}
      confirmDisabled={busy || !code.trim()}
      error={error}>
      <ThemedTextInput
        value={code}
        onChangeText={setCode}
        placeholder="Enter referral code"
        autoCapitalize="characters"
        autoCorrect={false}
        /* The code is the only thing on this screen, so it takes focus and the
           keyboard's Go key submits it. */
        autoFocus
        returnKeyType="go"
        onSubmitEditing={() => {
          if (code.trim() && !busy) {
            void redeem();
          }
        }}
        style={[styles.input, { borderColor: theme.backgroundSelected }]}
      />
    </SettingsModal>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    textAlign: 'center',
  },
});
