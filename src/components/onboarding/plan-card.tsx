/**
 * The 2x2 plan-distance grid on "Choose your triathlon plan": a tinted card
 * per distance, a glowing partial-ring icon, the plan's name and blurb, then
 * its three discipline distances in km and miles.
 *
 * The ring is decorative in the same way the ability screens' level ring is —
 * the design's own placeholder for "how much of a leap this is," not a real
 * progress value — drawn as a fixed three-quarter arc.
 */
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../themed-text';

export type PlanDistanceInfo = {
  key: 'long' | 'middle' | 'olympic' | 'sprint';
  title: string;
  blurb: string;
  accent: string;
  swim: string;
  ride: string;
  run: string;
};

export const PlanDistances: PlanDistanceInfo[] = [
  {
    key: 'long',
    title: 'Long',
    blurb: 'Ironman, full distance, 140.6',
    accent: '#E5484D',
    swim: '3.8 km · 2.4 mi',
    ride: '180 km · 112 mi',
    run: '42.2 km · 26.2 mi',
  },
  {
    key: 'middle',
    title: 'Middle',
    blurb: 'Half Ironman, middle distance, 70.3, or 100km',
    accent: '#E5B93F',
    swim: '1.9 km · 1.2 mi',
    ride: '90 km · 56 mi',
    run: '21.1 km · 13.1 mi',
  },
  {
    key: 'olympic',
    title: 'Olympic',
    blurb: 'International distance, standard course, 5150',
    accent: '#3FB984',
    swim: '1.5 km · 0.93 mi',
    ride: '40 km · 25 mi',
    run: '10 km · 6.2 mi',
  },
  {
    key: 'sprint',
    title: 'Sprint',
    blurb: 'or Super Sprint',
    accent: '#6C7CE5',
    swim: '750 m · 0.5 mi',
    ride: '20 km · 12.4 mi',
    run: '5 km · 3.1 mi',
  },
];

export function PlanCard({
  info,
  selected,
  onPress,
}: {
  info: PlanDistanceInfo;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={info.title}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: info.accent,
          backgroundColor: `${info.accent}${selected ? '33' : '14'}`,
        },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.ring, { borderColor: `${info.accent}55` }]}>
        <View style={[styles.ringArc, { borderColor: info.accent }]} />
        <SymbolView name="bolt.fill" size={16} tintColor={info.accent} />
      </View>

      <ThemedText style={styles.title}>{info.title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.blurb} numberOfLines={3}>
        {info.blurb}
      </ThemedText>

      <View style={styles.stats}>
        <StatRow icon="figure.pool.swim" text={info.swim} />
        <StatRow icon="bicycle" text={info.ride} />
        <StatRow icon="figure.run" text={info.run} />
      </View>
    </Pressable>
  );
}

function StatRow({ icon, text }: { icon: 'figure.pool.swim' | 'bicycle' | 'figure.run'; text: string }) {
  return (
    <View style={styles.statRow}>
      <SymbolView name={icon} size={13} tintColor="#FFFFFF" />
      <ThemedText style={styles.statText} numberOfLines={1}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  ring: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  ringArc: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  title: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
  },
  blurb: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  stats: {
    marginTop: 'auto',
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
