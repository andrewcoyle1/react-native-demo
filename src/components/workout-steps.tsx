/**
 * The workout written out, set by set.
 *
 * The structure is the point. A swim main set is "3 rounds of (2 × 50m board
 * wag, 2 × 50m freestyle)", and that is what the athlete counts their way
 * through at the wall — so repeats are drawn as nested boxes rather than
 * expanded into a flat list of twelve identical lines. The nesting is the
 * instruction.
 *
 * Presentation only: every quantity arrives formatted, and `session-steps-
 * presenter.ts` decides what "50m" and "Z2" say. Nothing here knows a unit.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip } from './chip';
import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** How many characters of a cue show before "See more" takes over. */
const NoteClamp = 68;

export type StepRestProps = {
  /** "10s rest", or "Open rest" when the athlete decides. */
  label: string;
  open: boolean;
};

export type StepProps =
  | {
      kind: 'repeat';
      id: string;
      /** "Repeat 3x". */
      label: string;
      children: StepProps[];
      rest: StepRestProps | null;
    }
  | {
      kind: 'effort';
      id: string;
      /** "50m", "15s", "45 mins" — the amount, rendered in italic. */
      quantity: string;
      /** "Freestyle", "Body Position Kick". */
      name: string;
      /** "Z2", or null when the plan does not prescribe one. */
      zone: string | null;
      /** Kit this step alone needs — a BOARD chip under the line. */
      equipment: string[];
      /** A drill demonstration exists, marked with a play glyph. */
      hasVideo: boolean;
      note: string | null;
      rest: StepRestProps | null;
      /** "100m as 50m Z5 / 50m Z1" — the parts under a composite step. */
      parts: StepProps[];
    };

export type WorkoutSetProps = {
  id: string;
  /** "WARMUP SET". */
  label: string;
  /** Tints the set's label and the rules around its steps. */
  accent: string;
  steps: StepProps[];
};

/** A rest, shown as a small capsule under the step it follows. */
function Rest({ rest, accent }: { rest: StepRestProps; accent: string }) {
  const theme = useTheme();
  // An open rest is the athlete's call rather than a number to obey, so it is
  // drawn neutral: tinting it would read as another prescribed figure.
  const color = rest.open ? theme.textSecondary : accent;

  return (
    <View style={[styles.rest, { borderColor: color }]}>
      <ThemedText style={[styles.restLabel, { color }]}>{rest.label}</ThemedText>
    </View>
  );
}

/** The coaching cue under a step, clamped until tapped. */
function StepNote({ note }: { note: string }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const long = note.length > NoteClamp;

  return (
    <Pressable
      onPress={() => long && setExpanded(current => !current)}
      accessibilityRole={long ? 'button' : undefined}
      accessibilityState={long ? { expanded } : undefined}
      style={styles.note}>
      <Icon name="info.circle" size={11} tintColor={theme.textSecondary} style={styles.noteIcon} />

      <ThemedText themeColor="textSecondary" style={styles.noteText}>
        {expanded || !long ? note : `${note.slice(0, NoteClamp).trimEnd()}… `}
        {long && !expanded ? (
          <ThemedText style={[styles.seeMore, { color: theme.text }]}>See more</ThemedText>
        ) : null}
      </ThemedText>
    </Pressable>
  );
}

function EffortStep({
  step,
  accent,
}: {
  step: Extract<StepProps, { kind: 'effort' }>;
  accent: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.effort}>
      {/* Quantity, name and zone share one text flow so the line wraps as a
          sentence rather than as three boxes that break independently. */}
      <ThemedText style={styles.effortLine}>
        <ThemedText style={styles.quantity}>{step.quantity}</ThemedText>{' '}
        <ThemedText style={[styles.name, step.hasVideo && styles.linked]}>{step.name}</ThemedText>
        {step.hasVideo ? '  ' : null}
        {step.zone ? (
          <ThemedText themeColor="textSecondary" style={styles.at}>
            {' at '}
          </ThemedText>
        ) : null}
        {step.zone ? (
          <ThemedText style={[styles.zone, { color: accent }]}>{step.zone}</ThemedText>
        ) : null}
      </ThemedText>

      {step.hasVideo ? (
        <Icon
          name="play.circle.fill"
          size={13}
          tintColor={theme.textSecondary}
          style={styles.play}
        />
      ) : null}

      {step.parts.length > 0 ? (
        <View style={styles.parts}>
          {step.parts.map(part => (
            <Step key={part.id} step={part} accent={accent} />
          ))}
        </View>
      ) : null}

      {step.note ? <StepNote note={step.note} /> : null}

      {step.equipment.length > 0 ? (
        <View style={styles.equipment}>
          {step.equipment.map(item => (
            <Chip key={item} label={item} accent={accent} icon="wrench.and.screwdriver" />
          ))}
        </View>
      ) : null}

      {step.rest ? <Rest rest={step.rest} accent={accent} /> : null}
    </View>
  );
}

/**
 * One step, of either kind.
 *
 * Mutually recursive with `EffortStep` — a composite step holds parts, and a
 * repeat holds anything at all — which is what lets the swim's three levels
 * draw without the component knowing how deep it is.
 */
function Step({ step, accent }: { step: StepProps; accent: string }) {
  const theme = useTheme();

  if (step.kind === 'effort') {
    return <EffortStep step={step} accent={accent} />;
  }

  return (
    <View style={[styles.repeat, { borderColor: `${accent}66` }]}>
      <View style={styles.repeatHeader}>
        <Icon name="arrow.trianglehead.2.clockwise.rotate.90" size={12} tintColor={accent} />
        <ThemedText style={[styles.repeatLabel, { color: accent }]}>{step.label}</ThemedText>
      </View>

      <View style={styles.repeatBody}>
        {step.children.map(child => (
          <View
            key={child.id}
            style={[
              styles.child,
              { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
            ]}>
            <Step step={child} accent={accent} />
          </View>
        ))}
      </View>

      {step.rest ? <Rest rest={step.rest} accent={accent} /> : null}
    </View>
  );
}

export function WorkoutSteps({ sets }: { sets: WorkoutSetProps[] }) {
  const theme = useTheme();

  return (
    <View style={styles.sets}>
      {sets.map(set => (
        <View key={set.id} style={styles.set}>
          {/* The label is a capsule rather than a heading: the design reads the
              set names as markers down the side of the workout, not as titles
              the steps hang under. */}
          <View style={[styles.setLabel, { borderColor: set.accent }]}>
            <ThemedText style={[styles.setLabelText, { color: set.accent }]}>
              {set.label.toUpperCase()}
            </ThemedText>
          </View>

          {set.steps.map(step =>
            step.kind === 'repeat' ? (
              <Step key={step.id} step={step} accent={set.accent} />
            ) : (
              <ThemedView
                key={step.id}
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.backgroundSelected }]}>
                <Step step={step} accent={set.accent} />
              </ThemedView>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sets: {
    gap: Spacing.four,
  },
  set: {
    gap: Spacing.two,
  },
  setLabel: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  setLabelText: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  repeat: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  repeatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  repeatLabel: {
    fontSize: 13,
    fontWeight: 600,
    fontStyle: 'italic',
  },
  repeatBody: {
    gap: Spacing.two,
  },
  child: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  effort: {
    gap: Spacing.one,
  },
  effortLine: {
    fontSize: 15,
    lineHeight: 21,
  },
  quantity: {
    fontSize: 16,
    fontWeight: 700,
    fontStyle: 'italic',
  },
  name: {
    fontSize: 15,
  },
  /* A step with a demonstration behind it is a link, and reads as one. */
  linked: {
    textDecorationLine: 'underline',
  },
  play: {
    position: 'absolute',
    /* Parked on the first line's optical centre, beside the name. */
    top: 4,
    right: 0,
  },
  at: {
    fontSize: 14,
  },
  zone: {
    fontSize: 15,
    fontWeight: 600,
  },
  parts: {
    /* Indented under the total they add up to. */
    paddingLeft: Spacing.four,
    gap: Spacing.one,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  noteIcon: {
    marginTop: 3,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  seeMore: {
    fontSize: 12,
    fontWeight: 600,
  },
  equipment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  rest: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: 2,
    marginTop: Spacing.half,
  },
  restLabel: {
    fontSize: 11,
    fontWeight: 600,
  },
});
