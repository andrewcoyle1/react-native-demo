/**
 * "Find your middle distance race" — search plus a series filter over a
 * small local catalog (no race database exists yet; see
 * `constants/race-catalog.ts`). Tapping a race both records it and advances,
 * matching the choice-card screens; "Can't find your race?" is the honest
 * escape hatch, since the catalog is nowhere near complete.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { ThemedText } from '@/components/themed-text';
import { RaceCatalog, type CatalogRace } from '@/constants/race-catalog';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';
import { useCompleteSetupStep } from './use-step-tracking';

const Filters = ['IRONMAN', 'T100', 'Challenge'] as const;

export default function FindRaceScreen() {
  useScreenTracking('Find race');
  const theme = useTheme();
  const { update } = useOnboardingFlow();
  const completeStep = useCompleteSetupStep();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof Filters)[number] | null>(null);

  const results = useMemo(() => {
    return RaceCatalog.filter(race => {
      if (filter && race.series !== filter) return false;
      if (!query.trim()) return true;
      const haystack = `${race.name} ${race.place}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [query, filter]);

  function choose(race: CatalogRace) {
    update({ raceId: race.id });
    completeStep();
    router.push('/race-goal');
  }

  return (
    <OnboardingStep
      title="Find your middle distance race"
      progress={stepProgress('find-race', true)}
      showNext={false}
      onNext={() => {}}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search for your upcoming middle distance race"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.search,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
            color: theme.text,
          },
        ]}
      />

      <View style={styles.filters}>
        {Filters.map(name => {
          const active = filter === name;
          return (
            <Pressable
              key={name}
              onPress={() => setFilter(active ? null : name)}
              style={[
                styles.filter,
                { borderColor: active ? theme.text : theme.backgroundSelected },
              ]}>
              <ThemedText
                style={[styles.filterText, { color: active ? theme.text : theme.textSecondary }]}>
                {name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {results.map(race => (
          <Pressable
            key={race.id}
            onPress={() => choose(race)}
            style={({ pressed }) => [
              styles.row,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.badge}>{race.distanceLabel}</ThemedText>
            </View>
            <View style={styles.rowText}>
              <ThemedText style={styles.name} numberOfLines={1}>
                {race.name}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.place} numberOfLines={1}>
                {race.place} {race.flag}
              </ThemedText>
              <ThemedText style={styles.date} numberOfLines={1}>
                {race.date}
              </ThemedText>
            </View>
          </Pressable>
        ))}

        <Pressable
          onPress={() => {
            completeStep();
            router.push({ pathname: '/race-goal' });
          }}
          style={({ pressed }) => [
            styles.cantFind,
            { borderColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={styles.cantFindText}>Can&apos;t find your race?</ThemedText>
        </Pressable>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  search: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 15,
  },
  filters: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  filter: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  list: {
    marginTop: 20,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 4,
  },
  badge: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  name: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  place: {
    fontSize: 13,
    lineHeight: 17,
  },
  date: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  cantFind: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantFindText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.6,
  },
});
