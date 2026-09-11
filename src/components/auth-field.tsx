/**
 * A text field in the onboarding flow.
 *
 * Geometry measured from the design at 440pt: 54pt tall, a 20pt page gutter,
 * `backgroundElement` on `backgroundSelected` — which the app's palette already
 * had, because these screens are built from the same two greys as everything
 * else.
 */
import { Icon } from './icon';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export const AuthField = {
  height: 54,
  radius: 14,
  gap: 16,
  gutter: 20,
} as const;

type AuthTextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** Adds the reveal toggle and hides the text until it is pressed. */
  secure?: boolean;
};

export function AuthTextField({ secure = false, ...input }: AuthTextFieldProps) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);

  return (
    <View
      style={[
        styles.field,
        { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
      ]}>
      <TextInput
        {...input}
        secureTextEntry={secure && !revealed}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
      />

      {secure ? (
        <Pressable
          onPress={() => setRevealed(shown => !shown)}
          accessibilityRole="button"
          accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          hitSlop={12}
          style={({ pressed }) => pressed && styles.pressed}>
          <Icon
            name={revealed ? 'eye.slash' : 'eye'}
            size={20}
            weight="light"
            tintColor={theme.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: AuthField.height,
    borderRadius: AuthField.radius,
    borderWidth: 1,
    paddingHorizontal: 18,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    /* Explicit, because ThemedText's default would clip a 16pt line inside a
       54pt row on Android. */
    lineHeight: 20,
    padding: 0,
  },
  pressed: {
    opacity: 0.5,
  },
});
