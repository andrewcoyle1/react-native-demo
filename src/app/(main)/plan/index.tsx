import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { SectionScreen } from '@/components/section-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accents, Spacing, Zones } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';

/**
 * The week as planned against the week as done. Placeholder until the plan
 * service lands, in the same arrangement as `sample-week`.
 */
const DISCIPLINES = [
  { id: 'swim', icon: 'figure.pool.swim' as SFSymbol, accent: Zones.swim, done: '1 hr 57 min', planned: '2 hr 33 min', progress: 0.77 },
  { id: 'ride', icon: 'bicycle' as SFSymbol, accent: Zones.ride, done: '1 hr 31 min', planned: '3 hr 15 min', progress: 0.47 },
  { id: 'run', icon: 'figure.run' as SFSymbol, accent: Zones.easy, done: '58 min', planned: '2 hr 18 min', progress: 0.42 },
];

type PlannedItem = {
  id: string;
  title: string;
  icon: SFSymbol;
  accent: string;
  /** Planned figures, shown under the title. */
  target: string;
  status: 'done' | 'missed' | 'none';
  /** A recurring commitment rather than a session the plan generated. */
  commitment?: boolean;
  /** The activity that satisfied it, once one has been matched. */
  actual?: { at: string; title: string; stats: string[] };
};

type PlannedDay = { id: string; weekday: string; day: string; items: PlannedItem[] };

const DAYS: PlannedDay[] = [
  {
    id: 'mon-7',
    weekday: 'Mon',
    day: '7',
    items: [
      {
        id: 'mon-run',
        title: '25 min Easy Run w 4 × 15s Strides',
        icon: 'figure.run',
        accent: Zones.hard,
        target: '25 MIN    4.2 KM',
        status: 'done',
        actual: {
          at: '17:20',
          title: 'Stamina: 25 min Easy Run w 4 × 15s Strides',
          stats: ['25:06', '4.4 KM', '5:43/KM'],
        },
      },
      {
        id: 'mon-swim',
        title: 'Chest Pressure Cooker (8 rounds)',
        icon: 'figure.pool.swim',
        accent: Zones.swim,
        target: '57 MIN    2700 M',
        status: 'missed',
      },
    ],
  },
  {
    id: 'tue-8',
    weekday: 'Tue',
    day: '8',
    items: [
      {
        id: 'tue-gym',
        title: 'Weight Training',
        icon: 'dumbbell',
        accent: '#9AA4AE',
        target: 'GYM SESSION',
        status: 'done',
        commitment: true,
        actual: { at: '10:47', title: 'Lower', stats: ['1:04:30'] },
      },
      {
        id: 'tue-ride',
        title: '45 min Easy Ride',
        icon: 'bicycle',
        accent: Zones.ride,
        target: '45 MIN    16.6 KM',
        status: 'done',
        actual: {
          at: '09:34',
          title: 'Stamina: 45 min Easy Ride',
          stats: ['45:36', '19.0 KM', '25.0 KM/H'],
        },
      },
    ],
  },
  {
    id: 'wed-9',
    weekday: 'Wed',
    day: '9',
    items: [
      {
        id: 'wed-swim',
        title: 'Chest Pressure Cooker (8 rounds)',
        icon: 'figure.pool.swim',
        accent: Zones.swim,
        target: '57 MIN    2700 M',
        status: 'done',
        actual: {
          at: '11:51',
          title: 'Stamina: Chest Pressure Cooker (8 rounds)',
          stats: ['1:30:45', '2700 M', '2:19/100M'],
        },
      },
      {
        id: 'wed-run',
        title: '12 × 2 min Fast Intervals',
        icon: 'figure.run',
        accent: Zones.hard,
        target: '1 HR 8 MIN    12.9 KM',
        status: 'done',
        actual: {
          at: '13:57',
          title: 'Stamina: 6 × 2 min Fast Intervals',
          stats: ['33:03', '5.9 KM', '5:36/KM'],
        },
      },
    ],
  },
  {
    id: 'thu-10',
    weekday: 'Thu',
    day: '10',
    items: [
      {
        id: 'thu-gym',
        title: 'Weight Training',
        icon: 'dumbbell',
        accent: '#9AA4AE',
        target: 'GYM SESSION',
        status: 'none',
        commitment: true,
      },
      {
        id: 'thu-ride',
        title: '50 min Aerobic Ride',
        icon: 'bicycle',
        accent: Zones.ride,
        target: '50 MIN    20.4 KM',
        status: 'none',
      },
    ],
  },
  {
    id: 'fri-11',
    weekday: 'Fri',
    day: '11',
    items: [
      {
        id: 'fri-gym',
        title: 'Weight Training',
        icon: 'dumbbell',
        accent: '#9AA4AE',
        target: 'GYM SESSION',
        status: 'none',
        commitment: true,
      },
      {
        id: 'fri-swim',
        title: 'Relaxed Floating = Relaxed Swimming (2 rounds)',
        icon: 'figure.pool.swim',
        accent: Zones.swim,
        target: '38 MIN    1700 M',
        status: 'none',
      },
    ],
  },
  {
    id: 'sat-12',
    weekday: 'Sat',
    day: '12',
    items: [
      {
        id: 'sat-run',
        title: '45 min Long Run',
        icon: 'figure.run',
        accent: Zones.hard,
        target: '45 MIN    7.7 KM',
        status: 'none',
      },
    ],
  },
  {
    id: 'sun-13',
    weekday: 'Sun',
    day: '13',
    items: [
      {
        id: 'sun-ride',
        title: '1 hr 40 min Steady Long Ride',
        icon: 'bicycle',
        accent: Zones.ride,
        target: '1 HR 40 MIN    42.1 KM',
        status: 'none',
      },
    ],
  },
];

/**
 * One section per month. The month is what pins while its own days scroll —
 * the weekday and date stay in each row's gutter, beside the cards they label.
 */
const MONTHS = [{ id: '2026-09', meta: '2026  SEP', data: DAYS }];

export default function PlanScreen() {
  useScreenTracking('Plan');

  const theme = useTheme();

  return (
    <SectionScreen
      sections={MONTHS}
      keyExtractor={(day: PlannedDay) => day.id}
      renderItem={day => (
        <View style={styles.day}>
          {/* The date gutter and its connector run the height of the day, so a
              day with several sessions still reads as one group. */}
          <View style={styles.gutter}>
            <ThemedText themeColor="textSecondary" style={styles.weekday}>
              {day.weekday.toUpperCase()}
            </ThemedText>
            <ThemedText style={styles.dayNumber}>{day.day}</ThemedText>
            <View style={[styles.connector, { backgroundColor: theme.backgroundSelected }]} />
          </View>

          <View style={styles.dayItems}>
            {day.items.map(item => (
              <PlanRow key={item.id} item={item} />
            ))}
          </View>
        </View>
      )}
      renderHeader={section => (
        <View style={styles.monthRow}>
          <ThemedText themeColor="textSecondary" style={styles.month}>
            {section.meta}
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit plan"
            style={({ pressed }) => [
              styles.editPlan,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <SymbolView name="pencil" size={15} tintColor={theme.text} />
            <ThemedText style={styles.editPlanText}>Edit plan</ThemedText>
          </Pressable>
        </View>
      )}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          {/* Week stepper. The arrows flank a centred block so the week number
              stays put as the phase label either side changes length. */}
          <View style={styles.weekNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              hitSlop={Spacing.two}>
              <SymbolView name="chevron.left" size={22} tintColor={theme.textSecondary} />
            </Pressable>

            <View style={styles.weekBlock}>
              <View style={styles.weekMeta}>
                <SymbolView name="clock" size={14} tintColor={Accents.info} />
                <ThemedText style={[styles.metaText, { color: Accents.info }]}>
                  PREP plan
                </ThemedText>
              </View>

              <ThemedText style={styles.weekTitle}>
                Week 1
                <ThemedText themeColor="textSecondary" style={styles.weekTotal}>
                  {' '}
                  /24
                </ThemedText>
              </ThemedText>

              <View style={styles.weekMeta}>
                <SymbolView name="chart.line.uptrend.xyaxis" size={14} tintColor={Zones.hard} />
                <ThemedText style={[styles.metaText, { color: Zones.hard }]}>
                  BUILD phase
                </ThemedText>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next week"
              hitSlop={Spacing.two}>
              <SymbolView name="chevron.right" size={22} tintColor={theme.textSecondary} />
            </Pressable>
          </View>

          <ThemedView
            type="backgroundElement"
            style={[styles.summary, { borderColor: theme.backgroundSelected }]}>
            <View style={styles.rings}>
              {DISCIPLINES.map(discipline => (
                <View key={discipline.id} style={styles.ring}>
                  <ProgressRing
                    progress={discipline.progress}
                    color={discipline.accent}
                    size={84}
                    stroke={7}>
                    <SymbolView name={discipline.icon} size={30} tintColor={discipline.accent} />
                  </ProgressRing>

                  <ThemedText style={styles.ringLine}>{withUnits(discipline.done)}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.ringPlanned}>
                    {discipline.planned.toUpperCase()}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={[styles.total, { borderTopColor: theme.backgroundSelected }]}>
              <SymbolView name="clock" size={16} tintColor={Accents.recovery} />
              <ThemedText themeColor="textSecondary" style={styles.totalText}>
                TOTAL: 4 HR 28 MIN / 8 HR 6 MIN
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Swap units"
                hitSlop={Spacing.two}>
                <SymbolView
                  name="arrow.left.arrow.right"
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            </View>
          </ThemedView>
        </View>
      }>
    </SectionScreen>
  );
}

/**
 * Renders "1 hr 57 min" with the digits large and the units small.
 *
 * Splitting on whitespace is enough: every token is either a number or the unit
 * that follows it, and the unit is whatever is not a number.
 */
function withUnits(text: string) {
  return text.split(' ').map((token, index) =>
    /\d/.test(token) ? (
      <ThemedText key={index} style={styles.ringDone}>
        {index > 0 ? ' ' : ''}
        {token}
      </ThemedText>
    ) : (
      <ThemedText key={index} themeColor="textSecondary" style={styles.ringUnit}>
        {' '}
        {token.toUpperCase()}
      </ThemedText>
    ),
  );
}

function PlanRow({ item }: { item: PlannedItem }) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.row, { borderColor: theme.backgroundSelected }]}>
      <View style={styles.rowHeader}>
        <SymbolView name={item.icon} size={22} tintColor={item.accent} style={styles.rowIcon} />
        <ThemedText style={styles.rowTitle}>{item.title}</ThemedText>
      </View>

      <View style={styles.rowMetaLine}>
        <ThemedText themeColor="textSecondary" style={styles.rowMeta}>
          {item.target}
        </ThemedText>

        {item.commitment ? (
          <View style={styles.commitment}>
            <SymbolView
              name="arrow.triangle.2.circlepath"
              size={14}
              tintColor={Accents.commitment}
            />
            <ThemedText style={[styles.commitmentText, { color: Accents.commitment }]}>
              COMMITMENT
            </ThemedText>
          </View>
        ) : null}
      </View>

      {item.actual ? (
        <View style={styles.actual}>
          <ThemedText style={[styles.actualTitle, { color: Accents.schedule }]}>
            {item.actual.at} - {item.actual.title}
          </ThemedText>
          <View style={styles.actualStats}>
            {item.actual.stats.map(stat => (
              <ThemedText key={stat} style={styles.actualStat}>
                {stat}
              </ThemedText>
            ))}
          </View>
        </View>
      ) : null}

      {/* The status disc straddles the card's leading edge, tying the row to the
          date gutter beside it. */}
      {item.status !== 'none' ? (
        <View style={styles.statusSlot} pointerEvents="none">
          <View
            style={[
              styles.status,
              { backgroundColor: item.status === 'done' ? Accents.endurance : Accents.speed },
            ]}>
            <SymbolView
              name={item.status === 'done' ? 'checkmark' : 'xmark'}
              size={13}
              tintColor="#FFFFFF"
            />
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  /* The list's rows and headers carry their own gutter, so the list header has
     to bring its own rather than inheriting one from a shared container. */
  listHeader: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekBlock: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  weekMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  metaText: {
    fontSize: 14,
    fontWeight: 600,
  },
  weekTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 600,
  },
  weekTotal: {
    fontSize: 17,
    fontWeight: 500,
  },
  summary: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  rings: {
    flexDirection: 'row',
  },
  ring: {
    /* Equal thirds, so the rings sit on the card's natural gridlines. */
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  ringDone: {
    fontSize: 17,
    fontWeight: 600,
  },
  ringUnit: {
    fontSize: 12,
    fontWeight: 500,
  },
  ringLine: {
    marginTop: Spacing.two,
  },
  ringPlanned: {
    fontSize: 12,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  totalText: {
    /* Takes the slack so the swap button is pushed to the trailing edge while
       the label stays optically centred. */
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  month: {
    fontSize: 20,
    letterSpacing: 2,
  },
  editPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 40,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: 999,
  },
  editPlanText: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.6,
  },
  day: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gutter: {
    /* Wide enough to clear the status disc that straddles the card's edge. */
    width: 44,
    alignItems: 'flex-start',
  },
  weekday: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.6,
  },
  dayNumber: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 500,
  },
  connector: {
    /* Runs from under the date to the foot of the day's last card. */
    flex: 1,
    width: 1,
    marginTop: Spacing.two,
  },
  dayItems: {
    flex: 1,
    gap: Spacing.three,
  },
  row: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 600,
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowMeta: {
    fontSize: 13,
    letterSpacing: 0.4,
  },
  commitment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  commitmentText: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  actual: {
    gap: Spacing.one,
  },
  actualTitle: {
    fontSize: 14,
  },
  actualStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actualStat: {
    fontSize: 14,
  },
  /* Full height so the disc centres on the card whatever the row contains,
     rather than being pinned to a guessed offset from the top. */
  statusSlot: {
    position: 'absolute',
    left: -12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  status: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
