/**
 * Height, weight, and gender's height/weight-adjacent unit toggle — cm/ft-in
 * and kg/lb sit beside each wheel rather than as a segmented control, since
 * the design treats them as a secondary, almost incidental choice.
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { FieldCaption } from '@/components/onboarding/field-caption';
import { WheelPicker } from '@/components/onboarding/wheel-picker';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

export default function BodyMetricsScreen() {
  useScreenTracking('Body metrics');
  const theme = useTheme();
  const { answers, update } = useOnboardingFlow();

  return (
    <OnboardingStep
      title="Body metrics"
      subtitle="We'll use this to calculate your training zones and intensity"
      progress={stepProgress('body-metrics', answers.hasRace)}
      onNext={() => router.push('/fitness-heart-ftp')}>
      <FieldCaption>Height</FieldCaption>
      <View style={styles.row}>
        <WheelPicker
          min={100}
          max={230}
          value={answers.heightCm}
          onChange={heightCm => update({ heightCm })}
          width={200}
        />
        <UnitToggle
          options={[
            { value: 'cm', label: 'cm' },
            { value: 'ft-in', label: 'ft-in' },
          ]}
          value={answers.heightUnit}
          onChange={heightUnit => update({ heightUnit })}
        />
      </View>

      <View style={styles.section}>
        <FieldCaption>Weight</FieldCaption>
        <View style={styles.row}>
          <WheelPicker
            min={35}
            max={160}
            value={answers.weightKg}
            onChange={weightKg => update({ weightKg })}
            width={140}
          />
          <UnitToggle
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
            value={answers.weightUnit}
            onChange={weightUnit => update({ weightUnit })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <FieldCaption>Gender</FieldCaption>
        <View style={styles.genderRow}>
          {(['male', 'female'] as const).map(value => {
            const active = answers.gender === value;
            return (
              <Pressable
                key={value}
                onPress={() => update({ gender: value })}
                style={[
                  styles.genderChip,
                  {
                    borderColor: active ? theme.text : theme.backgroundSelected,
                    backgroundColor: active ? theme.backgroundElement : 'transparent',
                  },
                ]}>
                <ThemedText style={styles.genderLabel}>{value === 'male' ? 'Male' : 'Female'}</ThemedText>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => update({ gender: 'unspecified' })}>
          <ThemedText themeColor="textSecondary" style={styles.preferNot}>
            Prefer not to say
          </ThemedText>
        </Pressable>
      </View>
    </OnboardingStep>
  );
}

function UnitToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.units}>
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.unitPill,
              i === 0
                ? {
                    borderColor: theme.text,
                    backgroundColor: theme.backgroundElement,
                  }
                : styles.unitPillGhost,
              !active && i === 0 && { opacity: 0.4 },
            ]}>
            <ThemedText
              themeColor={active ? 'text' : 'textSecondary'}
              style={styles.unitLabel}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  section: {
    marginTop: 28,
  },
  units: {
    gap: 8,
  },
  unitPill: {
    height: 32,
    minWidth: 60,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  unitPillGhost: {
    borderWidth: 0,
  },
  unitLabel: {
    fontSize: 13,
    lineHeight: 17,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderChip: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '500',
  },
  preferNot: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
  },
});
