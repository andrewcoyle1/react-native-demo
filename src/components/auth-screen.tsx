/**
 * The shell the sign-in and sign-up screens share.
 *
 * A back arrow, a centred title, then the caller's content. The large voids in
 * the design — above the fields, below the provider buttons, and beneath the
 * footer, which floats rather than sitting on the safe area — are flex spacers
 * rather than fixed heights, so the layout holds its proportions on a shorter
 * phone instead of pushing the footer off the bottom.
 */
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthField } from './auth-field';
import { ThemedText } from './themed-text';

import { useTheme } from '@/hooks/use-theme';

type AuthScreenProps = {
  title: string;
  children: ReactNode;
  /** The "Don't have an account?" line, pinned above the safe-area inset. */
  footer?: ReactNode;
};

export function AuthScreen({ title, children, footer }: AuthScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={16}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <SymbolView name="arrow.left" size={22} weight="regular" tintColor={theme.text} />
        </Pressable>

        <ThemedText style={styles.title}>{title}</ThemedText>

        {children}

        {footer ? (
          <>
            <View style={styles.footer}>{footer}</View>
            {/* The design leaves 115pt under the footer at 956 — it is not
                pinned to the safe area. Weighted, like the voids above it. */}
            <View style={styles.tail} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** The shared "Don't have an account? Sign up" line. */
export function AuthFooterLink({
  question,
  action,
  onPress,
}: {
  question: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={action}
      hitSlop={12}
      style={({ pressed }) => [styles.footerRow, pressed && styles.pressed]}>
      <ThemedText themeColor="textSecondary" style={styles.footerText}>
        {question}{' '}
      </ThemedText>
      <ThemedText style={styles.footerAction}>{action}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: AuthField.gutter,
  },
  back: {
    width: 40,
    height: 30,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 39,
  },
  footer: {
    paddingTop: 32,
  },
  tail: {
    flex: 55,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    lineHeight: 20,
  },
  footerAction: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
