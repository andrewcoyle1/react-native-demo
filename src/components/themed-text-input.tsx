import type { Ref } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * `ref` is a plain prop here rather than a forwardRef wrapper — React 19 passes
 * refs through like any other prop, so callers can focus the input directly.
 */
type ThemedTextInputProps = TextInputProps & {
  ref?: Ref<TextInput>;
};

export function ThemedTextInput({ ref, style, ...rest }: ThemedTextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        { backgroundColor: theme.backgroundSelected, color: theme.text },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
});
