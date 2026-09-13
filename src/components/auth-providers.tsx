/**
 * The "or" rule and the Apple and Google buttons beneath it.
 *
 * Measured from the design: two 192pt buttons, 16pt apart, 47pt tall, on a
 * hairline rather than a fill — so they read as alternatives to the primary
 * action above rather than as competitors to it.
 *
 * Neither is wired yet. Both need native modules, an Apple Developer account
 * and a Google client id, and the server's OAuth exchange. They are drawn
 * because the layout is theirs, and they say so when pressed rather than
 * failing silently or pretending to work.
 */
import { Image } from 'expo-image';
import { Icon } from './icon';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { useTheme } from '@/hooks/use-theme';

type AuthProvidersProps = {
  /** Told which provider, so a screen can explain what is missing. */
  onPress: (provider: 'apple' | 'google') => void;
};

export function AuthProviders({ onPress }: AuthProvidersProps) {
  const theme = useTheme();

  return (
    <View style={styles.block}>
      <View style={styles.divider}>
        <View style={[styles.rule, { backgroundColor: theme.backgroundSelected }]} />
        <ThemedText themeColor="textSecondary" style={styles.or}>
          or
        </ThemedText>
        <View style={[styles.rule, { backgroundColor: theme.backgroundSelected }]} />
      </View>

      <View style={styles.row}>
        <ProviderButton provider="apple" label="Continue with Apple" onPress={onPress} />
        <ProviderButton provider="google" label="Continue with Google" onPress={onPress} />
      </View>
    </View>
  );
}

function ProviderButton({
  provider,
  label,
  onPress,
}: {
  provider: 'apple' | 'google';
  label: string;
  onPress: (provider: 'apple' | 'google') => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onPress(provider)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.provider,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      {provider === 'apple' ? (
        <Icon name="apple.logo" size={22} tintColor="#FFFFFF" />
      ) : (
        /* Google's mark is four colours and not in SF Symbols; redrawn from
           its public geometry as a small raster asset instead. */
        <Image source={require('../../assets/images/google-g.png')} style={styles.google} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 22,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  or: {
    fontSize: 14,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  provider: {
    flex: 1,
    height: 47,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  google: {
    width: 22,
    height: 22,
  },
  pressed: {
    opacity: 0.6,
  },
});
