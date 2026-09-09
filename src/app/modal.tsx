import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ChoiceChip } from '@/components/choice-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Accents, Spacing } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { reportError, trackEvent } from '@/services/telemetry';

/**
 * The feedback sheet behind the header's question-bubble button.
 *
 * Presented as a `transparentModal` (see the dashboard layout), so the screen
 * underneath stays mounted — it is what the blur has to blur. Everything here is
 * ordinary React Native, which is the point: unlike `Alert.alert` it can hold a
 * category picker, a text field and an attachment row.
 */

/** Liquid glass is iOS 26+; elsewhere the backdrop falls back to a plain dim. */
const glassAvailable = isLiquidGlassAvailable();

/** Placeholder until the real support address is settled. */
const SupportEmail = 'support@example.com';

type Category = {
  id: 'bug' | 'request' | 'question';
  label: string;
  icon: SFSymbol;
  accent: string;
  /** The prompt changes with the category, so the field asks the right question. */
  placeholder: string;
};

const Categories: Category[] = [
  {
    id: 'bug',
    label: 'Bug',
    icon: 'ladybug',
    accent: Accents.speed,
    placeholder: 'I found a bug when …',
  },
  {
    id: 'request',
    label: 'Request',
    icon: 'lightbulb',
    accent: Accents.equipment,
    placeholder: 'It would be great if …',
  },
  {
    id: 'question',
    label: 'Question',
    icon: 'questionmark.circle',
    accent: Accents.info,
    placeholder: 'How do I …',
  },
];

export default function FeedbackModal() {
  useScreenTracking('Share feedback');

  const theme = useTheme();
  const [categoryId, setCategoryId] = useState<Category['id']>('bug');
  const [message, setMessage] = useState('');

  const category = Categories.find(item => item.id === categoryId) ?? Categories[0];
  const canSend = message.trim().length > 0;

  function dismiss() {
    router.back();
  }

  function send() {
    // No backend yet: the event records that it happened and with what shape,
    // which is what the feedback pipeline will be built against.
    trackEvent('feedback_submitted', { category: categoryId, length: message.trim().length });
    router.back();
  }

  async function emailInstead() {
    const url = `mailto:${SupportEmail}?subject=${encodeURIComponent(`stamina ${category.label.toLowerCase()}`)}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      reportError(error, 'feedback: mailto');
    }
  }

  return (
    // `entering`/`exiting` fade the backdrop independently of the route
    // transition, so the dim does not pop in.
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.fill}>
      {/* The backdrop blurs the dashboard rather than merely dimming it, and
          doubles as the dismiss target people expect from a tap outside. */}
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor="rgba(0, 0, 0, 0.55)"
        style={[styles.fill, !glassAvailable && styles.backdropFallback]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centre}>
          {/* Stops presses on the content from reaching the backdrop behind it. */}
          <Pressable accessibilityViewIsModal>
            <View style={styles.sheet}>
              <View style={styles.header}>
                <SymbolView name="questionmark.bubble" size={26} tintColor={theme.text} />
                <ThemedText style={styles.title}>Share feedback</ThemedText>

                <Pressable
                  onPress={emailInstead}
                  accessibilityRole="button"
                  accessibilityLabel={`Or email us at ${SupportEmail}`}
                  style={({ pressed }) => [styles.mailPill, pressed && styles.pressed]}>
                  <ThemedText style={styles.mailText}>or</ThemedText>
                  <SymbolView name="envelope.open" size={16} tintColor={theme.text} />
                  <ThemedText style={styles.mailText}>us</ThemedText>
                </Pressable>
              </View>

              <View style={styles.field}>
                <ThemedText style={styles.label}>Category</ThemedText>
                <View style={styles.categories} accessibilityRole="radiogroup">
                  {Categories.map(item => (
                    <ChoiceChip
                      key={item.id}
                      label={item.label}
                      icon={item.icon}
                      accent={item.accent}
                      selected={item.id === categoryId}
                      onPress={() => setCategoryId(item.id)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <ThemedText style={styles.label}>Describe your feedback</ThemedText>
                <ThemedTextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder={category.placeholder}
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, { borderColor: theme.backgroundSelected }]}
                />
              </View>

              {/* Inert until an image picker is added — present so the layout and
                  the affordance are settled first. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Attach screenshots"
                style={({ pressed }) => [styles.attach, pressed && styles.pressed]}>
                <SymbolView name="camera" size={18} tintColor={theme.text} />
                <ThemedText style={styles.attachText}>Attach screenshots</ThemedText>
              </Pressable>

              <View style={styles.footer}>
                <Pressable
                  onPress={dismiss}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                  <ThemedText style={styles.actionText}>Cancel</ThemedText>
                </Pressable>

                <Pressable
                  onPress={send}
                  disabled={!canSend}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSend }}
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                  <ThemedText style={[styles.actionText, !canSend && styles.actionDisabled]}>
                    Send
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdropFallback: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
  },
  sheet: {
    /* No card: the content sits straight on the blurred backdrop. Inset further
       than the page's own 16pt gutter — measured off the design — so it reads as
       a dialog rather than as more of the screen behind it. */
    gap: Spacing.four,
    paddingHorizontal: Spacing.five,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    /* Takes the slack so the mail pill is pushed to the trailing edge. */
    flex: 1,
    fontSize: 22,
    fontWeight: 600,
  },
  mailPill: {
    /* Translucent white rather than a theme token: it sits on the blur, whose
       brightness varies with whatever is behind the modal. */
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    height: 34,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
  mailText: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.6,
  },
  field: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 15,
  },
  categories: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    height: 120,
    borderWidth: 1,
    backgroundColor: 'transparent',
    paddingTop: Spacing.two + 2,
  },
  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    /* Lifts the row to a 44pt target without spacing the label away from the
       field above it. */
    paddingVertical: Spacing.two + 2,
  },
  attachText: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
  },
  action: {
    /* Two equal halves, each centring its own label. */
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  actionText: {
    fontSize: 19,
  },
  actionDisabled: {
    opacity: 0.4,
  },
});
