import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ActionButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  busy?: boolean;
};

const Tints = {
  primary: '#3c87f7',
  destructive: '#e5484d',
} as const;

export function ActionButton({
  title,
  variant = 'primary',
  busy = false,
  disabled,
  ...rest
}: ActionButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || busy;

  const backgroundColor =
    variant === 'secondary' ? theme.backgroundSelected : Tints[variant];
  const textColor = variant === 'secondary' ? theme.text : '#ffffff';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}>
      {busy ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <ThemedText type="smallBold" style={{ color: textColor }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
