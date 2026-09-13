/**
 * The scaffold every profile settings modal is built on.
 *
 * Presented as a `transparentModal` (see `profile/_layout.tsx`), so the profile
 * screen stays mounted underneath — it is what the blur has to blur. That is
 * the same arrangement `app/modal.tsx` uses for the feedback dialog, and the
 * backdrop here is deliberately identical: one blurred ground, tap-outside to
 * dismiss, content sitting straight on it rather than inside a card.
 *
 * Two layouts, because the designs have two:
 *
 * - `dialog` centres an icon and title over the content and closes with a
 *   Cancel/Done pair. This is every modal that *sets a value*.
 * - `panel` puts the title on the left with a close button opposite, and leaves
 *   the buttons to the caller. This is every modal that *manages a service* —
 *   Garmin, Strava, calendar sync — where the actions are things like
 *   "Disconnect" rather than confirming an edit.
 */
import { router } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './icon';
import { ModalBackdrop } from './modal-backdrop';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SettingsModalProps = {
  title: string;
  icon?: SFSymbol;
  iconAccent?: string;
  /** The explanatory ⓘ line some pickers carry under the title. */
  note?: string;
  layout?: 'dialog' | 'panel';
  /** `dialog` only: the trailing action. Omit `onConfirm` to disable it. */
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  /**
   * Lets the dialog scroll when it is taller than the screen.
   *
   * Off by default, and deliberately: the wheel pickers are `ScrollView`s
   * themselves, and an outer vertical scroller swallows their gestures — the
   * wheels simply stop turning. Only the availability modal is tall enough to
   * need this, and it has no wheels.
   */
  scrollable?: boolean;
  /** Shown above the footer when a save fails. */
  error?: string | null;
  children: ReactNode;
};

export function SettingsModal({
  title,
  icon,
  iconAccent,
  note,
  layout = 'dialog',
  confirmLabel = 'Done',
  onConfirm,
  confirmDisabled = false,
  scrollable = false,
  error,
  children,
}: SettingsModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const panel = layout === 'panel';

  function dismiss() {
    router.back();
  }

  return (
    /* No `colorScheme` override: the scrim follows the appearance, because the
       content on top of it is themed and would otherwise be dark text on a dark
       ground in light mode. */
    <ModalBackdrop tintColor={theme.scrim} fallbackColor={theme.scrimOpaque}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}>
        {/*
         * Tap-to-dismiss lives in these two spacers, above and below the
         * dialog — not in one full-screen target behind it.
         *
         * A target behind the content has to be neutralised by a wrapper
         * around the content, and every way of doing that breaks the wheel
         * pickers: anything that claims the touch responder on press-down
         * holds it for the whole gesture, so a wheel turns only on a flick
         * fast enough to win the responder outright and does nothing when
         * turned gently. Handing the responder back to a descendant
         * `ScrollView` on move does not happen in practice.
         *
         * Putting the dismiss targets beside the dialog removes the conflict
         * rather than arbitrating it: nothing overlaps the content, so the
         * wheels get every gesture that lands on them, and a tap on the
         * dialog has nothing behind it to fall through to. The two spacers
         * also do the centring the dialog used to get from `justifyContent`.
         */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={styles.spacer}
          onPress={dismiss}
        />

        {/* `flexShrink` so a dialog taller than the screen — availability —
            gives the scroller a bounded height instead of overflowing.

            The fade lives here rather than on the backdrop: this sits inside
            the glass view's content, where an opacity animation is supported.
            Run it over the whole backdrop and the blur stops rendering. */}
        <Animated.View
          accessibilityViewIsModal
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={styles.content}>
          <Body scrollable={scrollable} insets={insets}>
            <View style={[styles.header, panel ? styles.headerPanel : styles.headerDialog]}>
              {icon ? <Icon name={icon} size={22} tintColor={iconAccent ?? theme.text} /> : null}
              <ThemedText style={[styles.title, panel && styles.titlePanel]}>{title}</ThemedText>

              {panel ? (
                <Pressable
                  onPress={dismiss}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
                  <Icon name="xmark" size={20} tintColor={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            {note ? (
              <View style={styles.noteRow}>
                <Icon name="info.circle" size={15} tintColor={theme.textSecondary} />
                <ThemedText themeColor="textSecondary" style={styles.note}>
                  {note}
                </ThemedText>
              </View>
            ) : null}

            {children}

            {/* Without this the provider's rethrow has nowhere to land and the
                modal just looks inert. Always give a failure somewhere to go. */}
            {error ? (
              <ThemedText style={styles.error} accessibilityRole="alert">
                {error}
              </ThemedText>
            ) : null}

            {panel ? null : (
              <View style={styles.footer}>
                <Pressable
                  onPress={dismiss}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                  <ThemedText style={styles.actionText}>Cancel</ThemedText>
                </Pressable>

                <Pressable
                  onPress={onConfirm}
                  disabled={confirmDisabled || !onConfirm}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: confirmDisabled || !onConfirm }}
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                  <ThemedText
                    style={[styles.actionText, confirmDisabled && styles.actionDisabled]}>
                    {confirmLabel}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </Body>
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={styles.spacer}
          onPress={dismiss}
        />
      </KeyboardAvoidingView>
    </ModalBackdrop>
  );
}

/**
 * The dialog's own container: a scroller only where one is wanted, and a plain
 * view everywhere else so nested wheels keep their gestures.
 */
function Body({
  scrollable,
  insets,
  children,
}: {
  scrollable: boolean;
  insets: { top: number; bottom: number };
  children: ReactNode;
}) {
  if (!scrollable) {
    // Short enough to be centred, so it never reaches the status bar or the
    // home indicator and needs no inset of its own.
    return <View style={styles.sheet}>{children}</View>;
  }

  return (
    <ScrollView
      bounces={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.sheet,
        /* Taller than the screen, so this one runs the full height and has to
           clear the status bar and the home indicator itself. */
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.four },
      ]}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  spacer: {
    /* Equal shares of whatever the dialog does not use, which centres it. */
    flex: 1,
  },
  content: {
    flexShrink: 1,
  },
  sheet: {
    /* No card: the content sits straight on the blurred backdrop, inset further
       than the page's own gutter so it reads as a dialog rather than as more of
       the screen behind it. */
    gap: Spacing.four,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerDialog: {
    justifyContent: 'center',
  },
  headerPanel: {
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
  },
  titlePanel: {
    /* Takes the slack so the close button is pushed to the trailing edge. */
    flex: 1,
    fontSize: 22,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: Spacing.two,
    /* Pulled up under the title: the note explains it rather than starting a
       new block of its own. */
    marginTop: -Spacing.two,
  },
  note: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
    color: '#E5484D',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.two,
  },
  action: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  actionText: {
    fontSize: 17,
  },
  actionDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
