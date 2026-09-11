/**
 * Name, date of birth, gender — the design's own three date-of-birth wheels
 * (day / month / year) share `WheelPicker`, the month column formatted to
 * its three-letter name instead of a number.
 */
import { router } from 'expo-router';
import { StyleSheet, View, Pressable } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { AuthTextField } from '@/components/auth-field';
import { FieldCaption } from '@/components/onboarding/field-caption';
import { WheelPicker } from '@/components/onboarding/wheel-picker';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useOnboardingFlow, type Gender } from '@/providers/onboarding-flow-provider';

import { stepProgress } from './flow-order';

const Months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PersonalDetailsScreen() {
  useScreenTracking('Personal details');
  const theme = useTheme();
  const { answers, update } = useOnboardingFlow();
  const dob = answers.dateOfBirth ?? { day: 1, month: 2, year: 95 };

  function setDob(patch: Partial<typeof dob>) {
    update({ dateOfBirth: { ...dob, ...patch } });
  }

  const genders: { value: Gender; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'unspecified', label: 'Prefer not to say' },
  ];

  return (
    <OnboardingStep
      title="Personal details"
      subtitle="Tell us a little more about yourself"
      progress={stepProgress('personal-details', answers.hasRace)}
      nextDisabled={!answers.name.trim()}
      onNext={() => router.push('/body-metrics')}>
      <FieldCaption style={styles.caption}>Name</FieldCaption>
      <AuthTextField
        value={answers.name}
        onChangeText={name => update({ name })}
        placeholder="Your name"
        autoCapitalize="words"
        returnKeyType="done"
      />

      <View style={styles.section}>
        <FieldCaption style={styles.caption}>Date of Birth</FieldCaption>
        <View style={styles.dobRow}>
          <View style={styles.dobColumn}>
            <ThemedText themeColor="textSecondary" style={styles.dobHeader}>
              DD
            </ThemedText>
            <WheelPicker min={1} max={31} value={dob.day} onChange={day => setDob({ day })} width={90} />
          </View>
          <View style={styles.dobColumn}>
            <ThemedText themeColor="textSecondary" style={styles.dobHeader}>
              Mon
            </ThemedText>
            <WheelPicker
              min={1}
              max={12}
              value={dob.month}
              format={v => Months[v - 1] ?? ''}
              onChange={month => setDob({ month })}
              width={110}
            />
          </View>
          <View style={styles.dobColumn}>
            <ThemedText themeColor="textSecondary" style={styles.dobHeader}>
              YY
            </ThemedText>
            <WheelPicker
              min={30}
              max={99}
              value={dob.year}
              onChange={year => setDob({ year })}
              width={90}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <FieldCaption style={styles.caption}>Gender</FieldCaption>
        <View style={styles.genderRow}>
          {genders.map(gender => {
            const active = answers.gender === gender.value;
            return (
              <Pressable
                key={gender.value}
                onPress={() => update({ gender: gender.value })}
                style={[
                  styles.genderChip,
                  { borderColor: active ? theme.text : theme.backgroundSelected, backgroundColor: active ? theme.backgroundElement : 'transparent' },
                ]}>
                <ThemedText style={styles.genderLabel} numberOfLines={1}>
                  {gender.label}
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
  section: {
    marginTop: 30,
  },
  dobRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  dobColumn: {
    alignItems: 'center',
  },
  dobHeader: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 4,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  genderChip: {
    height: 54,
    minWidth: 130,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  genderLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '500',
  },
});
