/**
 * Swimming / running / cycling ability — the same shape three times over,
 * differing only in wording, the session-distance chip set, and the
 * discipline's own accent and icon.
 *
 * Swim shows a 2x2 grid of session-distance chips (it has no notion of
 * "experience level" the way run and cycle do); run and cycle instead lead
 * with the three-way `SegmentedControl`. Both then share the same
 * "how far can you currently manage" line, distance label, slider and "I'm
 * not sure" row.
 */
import { StyleSheet, View, Pressable } from 'react-native';

import { OnboardingStep } from '../onboarding-step';
import { CheckRow } from './check-row';
import { DiscreteSlider } from './discrete-slider';
import { FieldCaption } from './field-caption';
import { SegmentedControl, type ExperienceLevel } from './segmented-control';
import { ThemedText } from '../themed-text';

import { Disciplines } from '@/constants/disciplines';
import { useTheme } from '@/hooks/use-theme';
import type { Discipline } from '@/domain/training';

export type AbilityAnswer = {
  experience: ExperienceLevel;
  distanceIndex: number;
  notSure: boolean;
};

type AbilityScreenProps = {
  discipline: Extract<Discipline, 'swim' | 'run' | 'ride'>;
  title: string;
  progress: number;
  sessionChips?: string[];
  experienceNote?: string;
  distanceLabels: string[];
  distancePrompt: string;
  answer: AbilityAnswer;
  onChange: (answer: AbilityAnswer) => void;
  onNext: () => void;
};

export function AbilityScreen({
  discipline,
  title,
  progress,
  sessionChips,
  experienceNote,
  distanceLabels,
  distancePrompt,
  answer,
  onChange,
  onNext,
}: AbilityScreenProps) {
  const theme = useTheme();
  const info = Disciplines[discipline];

  return (
    <OnboardingStep title={title} progress={progress} onNext={onNext}>
      {sessionChips ? (
        <>
          <FieldCaption style={styles.caption}>Usual swim session distance</FieldCaption>
          <ThemedText themeColor="textSecondary" style={styles.prompt}>
            How far do you typically swim in a training session?
          </ThemedText>
          <View style={styles.chipGrid}>
            {sessionChips.map((chip, i) => {
              const active = answer.distanceIndex === i;
              return (
                <Pressable
                  key={chip}
                  onPress={() => onChange({ ...answer, distanceIndex: i })}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? info.accent : theme.backgroundSelected,
                      backgroundColor: active ? `${info.accent}22` : 'transparent',
                    },
                  ]}>
                  <ThemedText
                    style={[styles.chipText, { color: active ? info.accent : theme.text }]}
                    numberOfLines={1}>
                    {chip}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
        </>
      ) : (
        <>
          <FieldCaption style={styles.caption}>{`${info.label} experience`}</FieldCaption>
          <SegmentedControl
            value={answer.experience}
            onChange={experience => onChange({ ...answer, experience })}
            accent={info.accent}
          />
          {experienceNote ? (
            <ThemedText themeColor="textSecondary" style={styles.note}>
              ⓘ {experienceNote}
            </ThemedText>
          ) : null}
          <View style={[styles.divider, { backgroundColor: theme.backgroundSelected, marginTop: 24 }]} />
        </>
      )}

      <FieldCaption style={styles.caption}>{`${info.label} distance`}</FieldCaption>
      <ThemedText themeColor="textSecondary" style={styles.prompt}>
        {distancePrompt}
      </ThemedText>

      <View style={styles.distanceRow}>
        <ThemedText style={{ fontSize: 18 }}>
          {discipline === 'swim' ? '🏊' : discipline === 'run' ? '🏃' : '🚴'}
        </ThemedText>
        <ThemedText style={styles.distanceLabel}>{distanceLabels[answer.distanceIndex]}</ThemedText>
      </View>

      <View style={styles.sliderWrap}>
        <DiscreteSlider
          stepCount={distanceLabels.length}
          index={answer.distanceIndex}
          onChange={distanceIndex => onChange({ ...answer, distanceIndex })}
        />
      </View>

      <CheckRow
        label="I'm not sure"
        checked={answer.notSure}
        onToggle={() => onChange({ ...answer, notSure: !answer.notSure })}
      />
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  caption: {
    width: '100%',
    textAlign: 'center',
  },
  prompt: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 14,
    textAlign: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    flexBasis: '47%',
    flexGrow: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  chipText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 24,
  },
  note: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  distanceLabel: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
  },
  sliderWrap: {
    marginTop: 32,
    marginBottom: 40,
  },
});
