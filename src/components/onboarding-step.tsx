/**
 * The shell every screen in the personalisation flow shares, from "Do you
 * have a race in mind?" through the plan overview: a chevron back button, a
 * progress bar, a centred title and optional subtitle, the screen's own
 * content, and a "Next" button pinned above the safe area.
 *
 * Geometry measured from the design at 440pt: the progress bar is a 4pt-tall,
 * 160pt-wide pill centred in the width, sitting at the same height as the
 * back chevron; the title starts 33pt below it; the button's bottom edge
 * sits 50pt above the screen's foot, safe-area inset included.
 *
 * This is deliberately a different shell from `AuthScreen` — the two flows
 * read differently in the design: sign-in/sign-up use a full arrow and no
 * progress indicator, this one a bare chevron and a progress pill, because
 * this flow is a sequence of steps rather than a single destination.
 */
import { router } from 'expo-router';
import { Icon } from './icon';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton } from './auth-button';
import { ThemedText } from './themed-text';

import { ActivePlanAccent } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type OnboardingStepProps = {
  title: string;
  subtitle?: string;
  /** 0-1. How far through the flow this screen sits. */
  progress: number;
  children: ReactNode;
  nextLabel?: string;
  onNext: () => void;
  nextDisabled?: boolean;
  nextBusy?: boolean;
  /** Omit to hide the footer entirely — the design does this for the two
      choice screens ("Do you have a race in mind?", plan selection), which
      advance as soon as a card is tapped rather than needing a Next. */
  showNext?: boolean;
  /** Overrides the back button's default `router.back()`. */
  onBack?: () => void;
};

export function OnboardingStep({
  title,
  subtitle,
  progress,
  children,
  nextLabel = 'Next',
  onNext,
  nextDisabled = false,
  nextBusy = false,
  showNext = true,
  onBack,
}: OnboardingStepProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={onBack ?? (() => router.back())}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={16}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Icon name="chevron.left" size={24} weight="regular" tintColor={theme.text} />
          </Pressable>

          {/* Centred independently of the back button, not flex-filling the
              space beside it — the design leaves generous margins on both
              sides of a fixed 160pt pill. */}
          <View style={styles.trackWrap} pointerEvents="none">
            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.max(0, Math.min(1, progress)) * 100}%` },
                ]}
              />
            </View>
          </View>
        </View>

        <ThemedText style={styles.title}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}

        <View style={styles.body}>{children}</View>
      </ScrollView>

      {showNext ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <AuthButton
            title={nextLabel}
            onPress={onNext}
            disabled={nextDisabled}
            busy={nextBusy}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    height: 30,
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: -4,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackWrap: {
    alignItems: 'center',
  },
  track: {
    width: 160,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: ActivePlanAccent,
  },
  title: {
    marginTop: 33,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  body: {
    marginTop: 34,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  pressed: {
    opacity: 0.5,
  },
});
