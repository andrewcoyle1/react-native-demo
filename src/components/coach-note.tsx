/**
 * The coach's word on a session, folded away inside the workout card.
 *
 * Collapsed it shows one truncated line, which is enough to tell whether the
 * note is worth opening. Expanding is local state — the note is a detail of this
 * card, and nothing above it needs to know.
 */
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CoachNoteProps = {
  coach: string;
  note: string;
};

/** "Coach Ari" -> "A". Placeholder until coach portraits are in the asset set. */
function initial(name: string) {
  const last = name.trim().split(/\s+/).pop() ?? '';
  return last.charAt(0).toUpperCase();
}

export function CoachNote({ coach, note }: CoachNoteProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => setExpanded(current => !current)}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`Note from ${coach}`}
      accessibilityHint={expanded ? 'Collapses the note' : 'Expands the note'}
      style={({ pressed }) => [
        styles.note,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.initial}>{initial(coach)}</ThemedText>
        </View>

        <ThemedText themeColor="textSecondary" style={styles.coach}>
          {coach}
        </ThemedText>

        {/* Rotated rather than swapped for a `chevron.up`, so the two states are
            the same glyph and cannot drift apart. */}
        <SymbolView
          name="chevron.down"
          size={16}
          tintColor={theme.textSecondary}
          style={expanded ? styles.chevronUp : undefined}
        />
      </View>

      <ThemedText
        themeColor="textSecondary"
        style={styles.body}
        numberOfLines={expanded ? undefined : 1}>
        {note}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 15,
    fontWeight: 700,
  },
  coach: {
    /* Takes the slack so the chevron is pushed to the trailing edge. */
    flex: 1,
    fontSize: 16,
  },
  chevronUp: {
    transform: [{ rotate: '180deg' }],
  },
  body: {
    /* Indented to the avatar's trailing edge, so the text hangs off the name. */
    marginLeft: 34 + Spacing.two,
    fontSize: 15,
  },
});
