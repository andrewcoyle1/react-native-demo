/**
 * The athlete and the race they are training for.
 *
 * Gold rather than the neutral card colour: it is the one thing on the profile
 * screen that is about the goal rather than about settings, and the accent is
 * the same equipment gold used elsewhere, at the same fill opacity.
 */
import { Image, type ImageProps } from 'expo-image';
import { Icon } from './icon';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { AccentFillOpacity, Accents, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type RaceTarget = {
  icon: SFSymbol;
  accent: string;
  /** Primary figure, in the athlete's own units. */
  value: string;
  unit: string;
  /** The same distance converted, shown quieter beneath. */
  alternate: string;
};

type ProfileCardProps = {
  name: string;
  race: string;
  place: string;
  date: string;
  /** Goal time for the race. */
  target: string;
  targets: RaceTarget[];
  artwork?: ImageProps['source'];
  onEditName?: () => void;
  onEditTarget?: () => void;
};

/** "Andrew" -> "A". Placeholder until profile photos are in the asset set. */
function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function ProfileCard({
  name,
  race,
  place,
  date,
  target,
  targets,
  artwork,
  onEditName,
  onEditTarget,
}: ProfileCardProps) {
  const theme = useTheme();
  const accent = Accents.equipment;

  return (
    <View
      style={[
        styles.card,
        { borderColor: accent, backgroundColor: `${accent}${AccentFillOpacity}` },
      ]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { borderColor: accent }]}>
          <ThemedText style={styles.initial}>{initial(name)}</ThemedText>
        </View>

        <ThemedText style={styles.name}>{name}</ThemedText>

        <Pressable
          onPress={onEditName}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          hitSlop={Spacing.two}
          style={({ pressed }) => pressed && styles.pressed}>
          <Icon name="pencil" size={16} tintColor={theme.textSecondary} />
        </Pressable>
      </View>

      {artwork ? (
        <Image
          source={artwork}
          style={styles.artwork}
          contentFit="cover"
          /* Decorative: the race name below already carries the meaning. */
          accessible={false}
        />
      ) : null}

      <View style={styles.labels}>
        <ThemedText themeColor="textSecondary" style={styles.label}>
          Training for:
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.label}>
          Target
        </ThemedText>
      </View>

      <View style={styles.raceRow}>
        <ThemedText style={styles.race}>{race}</ThemedText>

        <Pressable
          onPress={onEditTarget}
          accessibilityRole="button"
          accessibilityLabel={`Edit target time, currently ${target}`}
          hitSlop={Spacing.two}
          style={({ pressed }) => [styles.targetButton, pressed && styles.pressed]}>
          <Icon name="pencil" size={13} tintColor={theme.textSecondary} />
          <ThemedText themeColor="textSecondary" style={styles.target}>
            {target}
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText themeColor="textSecondary" style={styles.place}>
        {place}
      </ThemedText>
      <ThemedText style={styles.date}>{date}</ThemedText>

      <View style={[styles.targets, { borderColor: `${accent}${AccentFillOpacity}` }]}>
        {targets.map(item => (
          <View key={item.icon} style={styles.targetItem}>
            <View style={styles.targetTop}>
              <Icon name={item.icon} size={16} tintColor={item.accent} />
              <ThemedText style={styles.targetValue}>
                {item.value}
                <ThemedText themeColor="textSecondary" style={styles.targetUnit}>
                  {' '}
                  {item.unit}
                </ThemedText>
              </ThemedText>
            </View>
            <ThemedText themeColor="textSecondary" style={styles.targetAlternate}>
              {item.alternate}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    marginBottom: Spacing.one,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 17,
    fontWeight: 700,
  },
  name: {
    /* Takes the slack so the pencil sits at the trailing edge. */
    flex: 1,
    fontSize: 19,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.5,
  },
  artwork: {
    height: 150,
    borderRadius: Spacing.two,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  label: {
    fontSize: 12,
  },
  raceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  race: {
    flex: 1,
    fontSize: 17,
    fontWeight: 500,
  },
  targetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  target: {
    fontSize: 13,
  },
  place: {
    fontSize: 13,
  },
  date: {
    fontSize: 15,
    marginBottom: Spacing.two,
  },
  targets: {
    flexDirection: 'row',
    padding: Spacing.two + 2,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  targetItem: {
    /* Equal thirds, so the three distances sit on the box's own gridlines. */
    flex: 1,
    gap: 1,
  },
  targetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  targetValue: {
    fontSize: 15,
    fontWeight: 600,
  },
  targetUnit: {
    fontSize: 11,
  },
  targetAlternate: {
    fontSize: 11,
    /* Lines up under the value, past the symbol. */
    marginLeft: 16 + Spacing.one + 2,
  },
});
