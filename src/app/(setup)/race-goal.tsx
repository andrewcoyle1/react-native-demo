/**
 * "What's your goal?" — a target finish time for the chosen race, or none.
 *
 * The two hour/minute wheels and the "no target time" pill are mutually
 * exclusive: picking a time clears `noTargetTime` and vice versa, so the
 * plan generator (eventually) never receives both.
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

export default function RaceGoalScreen() {
  useScreenTracking('Race goal');
  const theme = useTheme();
  const { answers, update, mode } = useOnboardingFlow();

  const raceName = 'IRONMAN 70.3 Luxembourg';

  return (
    <OnboardingStep
      title="What's your goal?"
      subtitle={`Set your target time for ${raceName}`}
      progress={stepProgress('race-goal', true, mode)}
      onNext={() => router.push('/other-races')}>
      <FieldCaption style={styles.caption}>{`Target time for ${raceName}`}</FieldCaption>

      <View style={styles.wheels}>
        <View style={styles.wheelGroup}>
          <WheelPicker
            min={0}
            max={15}
            value={answers.targetHours ?? 6}
            onChange={targetHours => update({ targetHours, noTargetTime: false })}
          />
          <ThemedText themeColor="textSecondary" style={styles.unit}>
            hr
          </ThemedText>
        </View>
        <View style={styles.wheelGroup}>
          <WheelPicker
            min={0}
            max={59}
            value={answers.targetMinutes ?? 0}
            format={v => String(v).padStart(2, '0')}
            onChange={targetMinutes => update({ targetMinutes, noTargetTime: false })}
          />
          <ThemedText themeColor="textSecondary" style={styles.unit}>
            min
          </ThemedText>
        </View>
      </View>

      <View style={styles.orRow}>
        <ThemedText themeColor="textSecondary" style={styles.or}>
          or
        </ThemedText>
        <Pressable
          onPress={() => update({ noTargetTime: true, targetHours: null, targetMinutes: null })}
          accessibilityRole="radio"
          accessibilityState={{ selected: answers.noTargetTime }}
          style={({ pressed }) => [
            styles.noTarget,
            {
              borderColor: answers.noTargetTime ? theme.text : theme.backgroundSelected,
              backgroundColor: answers.noTargetTime ? theme.backgroundElement : 'transparent',
            },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={styles.noTargetText}>no target time, aiming to complete the race</ThemedText>
        </Pressable>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  caption: {
    width: '100%',
    textAlign: 'center',
  },
  wheels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  wheelGroup: {
    alignItems: 'center',
    gap: 4,
  },
  unit: {
    fontSize: 13,
    lineHeight: 17,
  },
  orRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 48,
  },
  or: {
    fontSize: 14,
    lineHeight: 18,
  },
  noTarget: {
    // Not `flex: 1` any more — that stretched the pill to the far edge, which
    // read as filling the row rather than sitting centred in it. Shrinks
    // instead, wrapping its text over two lines if the centred pair would
    // otherwise run off the edge.
    flexShrink: 1,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  noTargetText: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
