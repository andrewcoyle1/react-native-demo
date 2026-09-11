/**
 * "Weekly commitments" — other fixed activities the plan should work around.
 * Same dashed-example idiom as `other-races.tsx`: the two rows shown when the
 * list is empty are hints at the shape of an entry, not real placeholders.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';

import { stepProgress } from './flow-order';

const Examples = [
  { icon: '🏃', name: 'e.g. Run club', tag: '~45 MIN · EASY · SUNDAYS' },
  { icon: '🏋️', name: 'e.g. Gym session', tag: 'MONDAYS & FRIDAYS' },
];

export default function WeeklyCommitmentsScreen() {
  useScreenTracking('Weekly commitments');
  const theme = useTheme();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <OnboardingStep
      title="Weekly commitments"
      subtitle="Add your existing weekly commitments so your plan incorporates them"
      progress={stepProgress('weekly-commitments', true)}
      onNext={() => router.push('/distance-preferences')}>
      <ThemedText themeColor="textSecondary" style={styles.empty}>
        No commitments added yet
      </ThemedText>

      <View style={styles.examples}>
        {Examples.map(example => (
          <View key={example.name} style={[styles.example, { borderColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.icon}>{example.icon}</ThemedText>
            <View style={styles.exampleText}>
              <ThemedText themeColor="textSecondary" style={styles.name}>
                {example.name}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.tag}>
                {example.tag}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => setNotice('Adding a weekly commitment is not wired up yet.')}
        style={({ pressed }) => [styles.addButton, { borderColor: theme.backgroundSelected }, pressed && styles.pressed]}>
        <ThemedText style={styles.addButtonText}>+ Add weekly commitment</ThemedText>
      </Pressable>

      {notice ? (
        <ThemedText type="small" style={styles.notice} accessibilityRole="alert">
          {notice}
        </ThemedText>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    marginTop: 130,
    marginBottom: 24,
  },
  examples: {
    gap: 12,
  },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 14,
    opacity: 0.6,
  },
  icon: {
    fontSize: 18,
  },
  exampleText: {
    gap: 2,
  },
  name: {
    fontSize: 15,
    lineHeight: 19,
  },
  tag: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  addButton: {
    marginTop: 20,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
  },
  notice: {
    marginTop: 12,
    textAlign: 'center',
    color: '#E5484D',
  },
  pressed: {
    opacity: 0.6,
  },
});
