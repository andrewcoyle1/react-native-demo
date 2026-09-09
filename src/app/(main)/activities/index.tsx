import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { RouteLine, type RoutePoint } from '@/components/route-line';
import { SectionScreen } from '@/components/section-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accents, Spacing, Zones } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';

const ThumbSize = 88;

/** Normalised route shapes, standing in for map tiles. */
const RUN_ROUTE: RoutePoint[] = [
  { x: 0.04, y: 0.62 }, { x: 0.18, y: 0.55 }, { x: 0.3, y: 0.6 }, { x: 0.44, y: 0.5 },
  { x: 0.58, y: 0.52 }, { x: 0.72, y: 0.44 }, { x: 0.88, y: 0.47 }, { x: 0.97, y: 0.4 },
];

const RIDE_ROUTE: RoutePoint[] = [
  { x: 0.42, y: 0.08 }, { x: 0.6, y: 0.14 }, { x: 0.66, y: 0.3 }, { x: 0.58, y: 0.46 },
  { x: 0.62, y: 0.62 }, { x: 0.5, y: 0.76 }, { x: 0.34, y: 0.8 }, { x: 0.22, y: 0.68 },
  { x: 0.2, y: 0.5 }, { x: 0.28, y: 0.32 }, { x: 0.42, y: 0.08 },
];

type Stat = { icon: SFSymbol; value: string; unit?: string; accent: string };

type Activity = {
  id: string;
  when: string;
  title: string;
  icon: SFSymbol;
  accent: string;
  place?: string;
  route?: RoutePoint[];
  stats: Stat[];
  /** Small trailing marks: synced, uploaded, effort recorded. */
  marks: { icon: SFSymbol; accent: string }[];
};

const distance = (value: string, unit: string): Stat => ({
  icon: 'ruler',
  value,
  unit,
  accent: Accents.equipment,
});
const duration = (value: string): Stat => ({ icon: 'clock', value, accent: Accents.recovery });
const pace = (value: string, unit: string): Stat => ({
  icon: 'speedometer',
  value,
  unit,
  accent: Accents.speed,
});

const Marks = {
  linked: { icon: 'link' as SFSymbol, accent: Accents.recovery },
  uploaded: { icon: 'triangle.fill' as SFSymbol, accent: Accents.recovery },
  effort: { icon: 'bolt.fill' as SFSymbol, accent: Zones.hard },
};

type Week = { range: string; plan: string };

const THIS_WEEK: Activity[] = [
  {
    id: 'run-intervals',
    when: 'Wed Sep 09, 2026 13:57',
    title: 'Stamina: 6 × 2 min Fast Intervals',
    icon: 'figure.run',
    accent: Zones.hard,
    place: 'Dublin, IE',
    route: RUN_ROUTE,
    stats: [distance('5.9', 'km'), duration('33:03'), pace('5:36', '/km')],
    marks: [Marks.linked, Marks.uploaded, Marks.effort],
  },
  {
    id: 'swim-chest',
    when: 'Wed Sep 09, 2026 11:51',
    title: 'Stamina: Chest Pressure Cooker (8 rounds)',
    icon: 'figure.pool.swim',
    accent: Zones.swim,
    stats: [distance('2700', 'm'), duration('1:30:45'), pace('2:19', '/100m')],
    marks: [Marks.linked, Marks.uploaded, Marks.effort],
  },
  {
    id: 'ride-lunch',
    when: 'Tue Sep 08, 2026 12:55',
    title: 'Lunch Ride',
    icon: 'bicycle',
    accent: Zones.ride,
    place: 'Stapolin, Baldoyle',
    route: RIDE_ROUTE,
    stats: [distance('19.0', 'km'), duration('46:21'), pace('24.6', 'km/h')],
    marks: [Marks.uploaded, Marks.effort],
  },
  {
    id: 'gym-lower',
    when: 'Tue Sep 08, 2026 10:47',
    title: 'Lower',
    icon: 'dumbbell',
    accent: '#9AA4AE',
    stats: [
      duration('1:04:30'),
      { icon: 'heart.fill', value: '100', unit: 'bpm', accent: Accents.speed },
      { icon: 'flame.fill', value: '345', unit: 'kcal', accent: Zones.hard },
    ],
    marks: [Marks.linked, Marks.uploaded, Marks.effort],
  },
  {
    id: 'ride-easy',
    when: 'Tue Sep 08, 2026 09:34',
    title: 'Stamina: 45 min Easy Ride',
    icon: 'bicycle',
    accent: Zones.ride,
    place: 'Stapolin, Baldoyle',
    route: RIDE_ROUTE,
    stats: [distance('19.0', 'km'), duration('45:36'), pace('25.0', 'km/h')],
    marks: [Marks.linked, Marks.uploaded, Marks.effort],
  },
  {
    id: 'run-strides',
    when: 'Mon Sep 07, 2026 17:20',
    title: 'Stamina: 25 min Easy Run w 4 × 15s Strides',
    icon: 'figure.run',
    accent: Zones.hard,
    place: 'Malahide, County Dublin',
    route: RUN_ROUTE,
    stats: [distance('4.4', 'km'), duration('25:06'), pace('5:43', '/km')],
    marks: [Marks.linked, Marks.uploaded, Marks.effort],
  },
];

const LAST_WEEK: Activity[] = [
  {
    id: 'run-long-prev',
    when: 'Sun Sep 06, 2026 09:12',
    title: 'Stamina: 40 min Long Run',
    icon: 'figure.run',
    accent: Zones.hard,
    place: 'Portmarnock, County Dublin',
    route: RUN_ROUTE,
    stats: [distance('6.8', 'km'), duration('40:11'), pace('5:54', '/km')],
    marks: [Marks.linked, Marks.uploaded, Marks.effort],
  },
  {
    id: 'swim-technique-prev',
    when: 'Fri Sep 04, 2026 07:38',
    title: 'Stamina: Relaxed Floating (2 rounds)',
    icon: 'figure.pool.swim',
    accent: Zones.swim,
    stats: [distance('1700', 'm'), duration('38:02'), pace('2:14', '/100m')],
    marks: [Marks.linked, Marks.uploaded],
  },
  {
    id: 'ride-endurance-prev',
    when: 'Thu Sep 03, 2026 16:20',
    title: 'Stamina: 50 min Aerobic Ride',
    icon: 'bicycle',
    accent: Zones.ride,
    place: 'Stapolin, Baldoyle',
    route: RIDE_ROUTE,
    stats: [distance('20.4', 'km'), duration('50:08'), pace('24.4', 'km/h')],
    marks: [Marks.linked, Marks.uploaded, Marks.effort],
  },
];

/**
 * One section per plan week. The range and the plan label are the header, which
 * pins while its own week is on screen.
 */
const WEEKS = [
  {
    id: 'week-1',
    meta: { range: 'Sep 7 - 13', plan: 'Prep Plan Week 1' } satisfies Week,
    data: THIS_WEEK,
  },
  {
    id: 'week-0',
    meta: { range: 'Aug 31 - Sep 6', plan: 'Prep Plan Week 0' } satisfies Week,
    data: LAST_WEEK,
  },
];

export default function ActivitiesScreen() {
  useScreenTracking('Activities');

  const theme = useTheme();
  const [query, setQuery] = useState('');

  // Filtering here rather than in the list keeps the empty case in one place,
  // and drops a week entirely once nothing in it matches.
  const sections = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return WEEKS;
    }
    return WEEKS.map(week => ({
      ...week,
      data: week.data.filter(activity => activity.title.toLowerCase().includes(term)),
    })).filter(week => week.data.length > 0);
  }, [query]);

  return (
    <SectionScreen
      sections={sections}
      keyExtractor={(activity: Activity) => activity.id}
      renderItem={activity => <ActivityRow activity={activity} />}
      renderHeader={section => (
        <View style={styles.rangeBlock}>
          <View style={styles.rangeRow}>
            <ThemedText style={styles.range}>{section.meta.range}</ThemedText>
            <View style={styles.rangeMeta}>
              <SymbolView name="clock" size={15} tintColor={Accents.info} />
              <ThemedText themeColor="textSecondary" style={styles.rangeMetaText}>
                {section.meta.plan}
              </ThemedText>
            </View>
          </View>

          {/* Part of the header rather than a row, so the rule travels with the
              range it underlines while the header is pinned. */}
          <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
        </View>
      )}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <View style={styles.searchRow}>
            <View style={[styles.search, { backgroundColor: theme.backgroundElement }]}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search activities"
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
                accessibilityLabel="Search activities"
                returnKeyType="search"
              />
              <SymbolView name="magnifyingglass" size={20} tintColor={theme.textSecondary} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="List options"
              hitSlop={Spacing.two}
              style={({ pressed }) => pressed && styles.pressed}>
              <SymbolView name="ellipsis" size={18} tintColor={theme.text} />
            </Pressable>
          </View>
        </View>
      }
      ListFooterComponent={
        sections.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No activities match “{query.trim()}”.
          </ThemedText>
        ) : undefined
      }>
    </SectionScreen>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.backgroundSelected }]}>
      {activity.route ? (
        <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]}>
          <RouteLine
            points={activity.route}
            width={ThumbSize}
            height={ThumbSize}
            color={activity.accent}
            stroke={2}
          />
        </View>
      ) : null}

      <View style={styles.body}>
        <View style={styles.whenRow}>
          <ThemedText themeColor="textSecondary" style={styles.when}>
            {activity.when.toUpperCase()}
          </ThemedText>

          <View style={styles.marks}>
            {activity.marks.map(mark => (
              <SymbolView key={mark.icon} name={mark.icon} size={14} tintColor={mark.accent} />
            ))}
          </View>
        </View>

        <View style={styles.titleRow}>
          <SymbolView name={activity.icon} size={20} tintColor={activity.accent} />
          <ThemedText style={styles.title} numberOfLines={1}>
            {activity.title}
          </ThemedText>
        </View>

        {activity.place ? (
          <View style={styles.placeRow}>
            <SymbolView name="mappin.and.ellipse" size={13} tintColor={theme.textSecondary} />
            <ThemedText themeColor="textSecondary" style={styles.place}>
              {activity.place.toUpperCase()}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.stats}>
          {activity.stats.map(stat => (
            <View key={stat.icon + stat.value} style={styles.stat}>
              <SymbolView name={stat.icon} size={15} tintColor={stat.accent} />
              <ThemedText style={styles.statValue}>
                {stat.value}
                {stat.unit ? (
                  <ThemedText themeColor="textSecondary" style={styles.statUnit}>
                    {' '}
                    {stat.unit.toUpperCase()}
                  </ThemedText>
                ) : null}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  /* The list's rows and headers carry their own gutter, so the list header has
     to bring its own rather than inheriting one from a shared container. */
  listHeader: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  rangeBlock: {
    gap: Spacing.three,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  search: {
    /* Takes the slack so the overflow button sits at the trailing edge. */
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.5,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  range: {
    fontSize: 20,
    fontWeight: 500,
  },
  rangeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rangeMetaText: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    /* Cancels the header's own gutter so the rule runs edge to edge. */
    marginHorizontal: -Spacing.three,
  },
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  thumb: {
    width: ThumbSize,
    height: ThumbSize,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  body: {
    /* Lets long titles truncate inside the row rather than push the thumbnail. */
    flex: 1,
    gap: Spacing.one + 2,
  },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  when: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
  marks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: 600,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  place: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    /* Tight enough that distance, duration and pace stay on one line beside a
       thumbnail; they wrap rather than truncate if a longer unit arrives. */
    gap: Spacing.two + 2,
    marginTop: Spacing.one,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 500,
  },
  statUnit: {
    fontSize: 12,
  },
  empty: {
    textAlign: 'center',
    fontSize: 15,
  },
});
