/**
 * "Distance preferences" — one metric/imperial choice shared by running and
 * cycling, a second for swimming (metres/yards independently, since pools are
 * often measured differently from open distances), and a pool-size picker.
 */
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { FieldCaption } from '@/components/onboarding/field-caption';
import { ThemedText } from '@/components/themed-text';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

const PoolSizes = ['20m', '25m', '30m', '33m', '50m'] as const;

function UnitCard({
  label,
  unit,
  selected,
  onPress,
}: {
  label: string;
  unit: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.unitCard,
        {
          borderColor: selected ? theme.text : theme.backgroundSelected,
          backgroundColor: selected ? theme.backgroundElement : 'transparent',
        },
      ]}>
      <ThemedText style={styles.unitLabel}>{label}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.unitSub}>
        {unit}
      </ThemedText>
      <View style={[styles.check, { borderColor: theme.textSecondary, backgroundColor: selected ? '#FFFFFF' : 'transparent' }]}>
        {selected ? <SymbolView name="checkmark" size={12} weight="bold" tintColor="#000000" /> : null}
      </View>
    </Pressable>
  );
}

export default function DistancePreferencesScreen() {
  useScreenTracking('Distance preferences');
  const theme = useTheme();
  const { answers, update } = useOnboardingFlow();

  return (
    <OnboardingStep
      title="Distance preferences"
      subtitle="Choose your preferred units for distance display"
      progress={stepProgress('distance-preferences', true)}
      onNext={() => router.push('/connect-apps')}>
      <View style={styles.captionRow}>
        <ThemedText style={styles.icon}>🏃</ThemedText>
        <FieldCaption>Running &amp; </FieldCaption>
        <ThemedText style={styles.icon}>🚴</ThemedText>
        <FieldCaption>Cycling</FieldCaption>
      </View>
      <View style={styles.unitRow}>
        <UnitCard
          label="Metric"
          unit="km"
          selected={answers.distanceUnit === 'metric'}
          onPress={() => update({ distanceUnit: 'metric' })}
        />
        <UnitCard
          label="Imperial"
          unit="mi"
          selected={answers.distanceUnit === 'imperial'}
          onPress={() => update({ distanceUnit: 'imperial' })}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.captionRow}>
          <ThemedText style={styles.icon}>🏊</ThemedText>
          <FieldCaption>Swimming</FieldCaption>
        </View>
        <View style={styles.unitRow}>
          <UnitCard
            label="Metric"
            unit="m"
            selected={answers.distanceUnit === 'metric'}
            onPress={() => update({ distanceUnit: 'metric' })}
          />
          <UnitCard
            label="Imperial"
            unit="yd"
            selected={answers.distanceUnit === 'imperial'}
            onPress={() => update({ distanceUnit: 'imperial' })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <FieldCaption style={styles.caption}>Pool Size</FieldCaption>
        <View style={[styles.poolRow, { borderColor: theme.backgroundSelected }]}>
          {PoolSizes.map(size => {
            const active = answers.poolSize === size;
            return (
              <Pressable
                key={size}
                onPress={() => update({ poolSize: size })}
                style={[styles.poolCell, active && { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText
                  style={[styles.poolLabel, { color: active ? theme.text : theme.textSecondary }]}>
                  {size.replace('m', ' M').toUpperCase()}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  caption: {
    width: '100%',
    textAlign: 'center',
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  unitCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 4,
  },
  unitLabel: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '600',
  },
  unitSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 28,
  },
  poolRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    marginTop: 4,
  },
  poolCell: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
