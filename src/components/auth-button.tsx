/**
 * The full-width button these screens are built around.
 *
 * Three weights, all measured from the design. `filled` is the primary action
 * and wears `backgroundSelected`; `outline` is the same shape with only a
 * hairline; `glass` is what the welcome screen's "Log in" uses over the
 * photograph — a light hairline and a faint dark wash, since a `#262626`
 * border disappears entirely against an image.
 */
import { Icon } from './icon';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';

import { useTheme } from '@/hooks/use-theme';

export const AuthButtonHeight = 50;

/** The welcome screen's Log in, measured at 48.3pt over the photograph. */
export const AuthGlassButtonHeight = 48;

/**
 * Measured off the design: the hairline reads about 22% white against the
 * frame behind it, over an interior a shade darker than its surroundings.
 */
const Glass = {
  border: 'rgba(255, 255, 255, 0.22)',
  fill: 'rgba(0, 0, 0, 0.15)',
  /* Over a photograph the label is light whatever the system scheme says. */
  label: '#FFFFFF',
} as const;

type AuthButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'outline' | 'glass';
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Rendered inside the button's right edge, behind its own divider. */
  accessory?: React.ReactNode;
};

/**
 * The Face ID cell the sign-in button carries in the design: a hairline
 * divider at the button's right edge, then a square cell — as wide as the
 * button is tall — holding the glyph. Exported so `sign-in.tsx` can pass it
 * as `accessory` without duplicating the geometry.
 */
export function AuthFaceIdAccessory({ onPress }: { onPress: () => void }) {
  const theme = useTheme();

  return (
    <>
      <View style={[styles.accessoryDivider, { backgroundColor: theme.backgroundSelected }]} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Sign in with Face ID"
        style={({ pressed }) => [styles.accessoryCell, pressed && styles.pressed]}>
        <Icon name="faceid" size={22} weight="light" tintColor={theme.textSecondary} />
      </Pressable>
    </>
  );
}

export function AuthButton({
  title,
  onPress,
  variant = 'filled',
  busy = false,
  disabled = false,
  style,
  accessory,
}: AuthButtonProps) {
  const theme = useTheme();
  const inactive = disabled || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        styles.button,
        variant === 'glass'
          ? { height: AuthGlassButtonHeight, backgroundColor: Glass.fill, borderColor: Glass.border }
          : {
              backgroundColor: variant === 'filled' ? theme.backgroundSelected : 'transparent',
              borderColor: theme.backgroundSelected,
            },
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={theme.text} />
      ) : (
        <ThemedText style={[styles.label, variant === 'glass' && { color: Glass.label }]}>
          {title}
        </ThemedText>
      )}

      {accessory}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: AuthButtonHeight,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
  },
  inactive: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
  accessoryDivider: {
    position: 'absolute',
    right: AuthButtonHeight,
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  accessoryCell: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: AuthButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
