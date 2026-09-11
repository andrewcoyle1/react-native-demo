/**
 * "Any other races on the way?" — optional B/C races before the main event.
 *
 * The design shows two dashed, greyed-out example rows when the list is
 * empty ("e.g. Battersea Park parkrun") purely as a hint at the shape of a
 * real entry; they are not placeholders that become real rows. Adding one
 * for real replaces the button's label from "Skip for now" to "Next".
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { ThemedText } from '@/components/themed-text';
import { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';

import { stepProgress } from './flow-order';

const ExampleRaces = [
  { day: 'SAT', date: '10', month: 'OCT', when: 'IN 4 WEEKS', name: 'e.g. Battersea Park parkrun', tag: 'C RACE · 5K RUN RACE' },
  { day: 'SUN', date: '22', month: 'NOV', when: 'IN 10 WEEKS', name: 'e.g. Dorney Lake Triathlon', tag: 'B RACE · SPRINT TRI' },
];

export default function OtherRacesScreen() {
  useScreenTracking('Other races');
  const theme = useTheme();
  const [notice, setNotice] = useState<string | null>(null);

  // No B/C races have been added yet — "Add B/C race" has no form to open.
  const hasRaces = false;

  return (
    <OnboardingStep
      title="Any other races on the way?"
      subtitle="Add B/C races between now and your main race"
      progress={stepProgress('other-races', true)}
      nextLabel={hasRaces ? 'Next' : 'Skip for now'}
      onNext={() => router.push('/ability-swim')}>
      <ThemedText themeColor="textSecondary" style={styles.empty}>
        No B/C races scheduled yet
      </ThemedText>

      <View style={styles.examples}>
        {ExampleRaces.map(race => (
          <View key={race.name} style={[styles.example, { borderColor: theme.backgroundSelected }]}>
            <View style={[styles.dateBox, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText themeColor="textSecondary" style={styles.dateDay}>
                {race.day}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.dateNum}>
                {race.date}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.dateMonth}>
                {race.month}
              </ThemedText>
            </View>
            <View style={styles.exampleText}>
              <ThemedText style={styles.when}>{race.when}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.exampleName}>
                {race.name}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.tag}>
                {race.tag}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => setNotice('Adding a B/C race is not wired up yet.')}
        style={({ pressed }) => [
          styles.addButton,
          { borderColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={styles.addButtonText}>+ Add B/C race</ThemedText>
      </Pressable>

      {notice ? (
        <ThemedText type="small" style={styles.notice} accessibilityRole="alert">
          {notice}
        </ThemedText>
      ) : null}

      <ThemedText themeColor="textSecondary" style={styles.footnote}>
        p.s. You can always add B/C races later
      </ThemedText>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    marginTop: 100,
    marginBottom: 24,
  },
  examples: {
    gap: 12,
  },
  example: {
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 12,
    opacity: 0.6,
  },
  dateBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
  },
  dateNum: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  dateMonth: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
  },
  exampleText: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  when: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#E5848A',
  },
  exampleName: {
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
  footnote: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
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
