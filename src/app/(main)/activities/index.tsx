import { Icon } from '@/components/icon';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AltActivitiesScreen } from '@/components/alt/activities-screen';
import { RouteLine } from '@/components/route-line';
import { SectionScreen } from '@/components/section-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accents, Spacing } from '@/constants/theme';
import { daysBetween, toDateKey } from '@/domain/training';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { toActivityRowProps, toActivityWeeks } from '@/presenters/activity-presenter';
import { useActivities } from '@/providers/activities-provider';
import { useDevicePreferences } from '@/providers/device-preferences';
import { useTraining } from '@/providers/training-provider';

const ThumbSize = 88;

/** What the presenter hands back for one row. */
type ActivityRowProps = ReturnType<typeof toActivityRowProps>;

export default function ActivitiesScreen() {
  useScreenTracking('Activities');

  const theme = useTheme();
  const [query, setQuery] = useState('');

  const { state, loadMore } = useActivities();
  const { alternateUi, ready: preferencesReady } = useDevicePreferences();

  const { plans } = useTraining();

  /**
   * Which plan week a given Monday fell in.
   *
   * The plans know their own start dates, so the caption is arithmetic rather
   * than a stored string — a week that falls outside every plan simply has none.
   */
  const planLabel = useCallback(
    (weekStarting: Date) => {
      if (plans.status !== 'ready') {
        return '';
      }
      const key = toDateKey(weekStarting);
      for (const plan of plans.data) {
        if (key >= plan.startDate && key <= plan.endDate) {
          const week = Math.floor(daysBetween(plan.startDate, key) / 7) + 1;
          return `${plan.name} Week ${week}`;
        }
      }
      return '';
    },
    [plans],
  );

  // Filtering here rather than in the list keeps the empty case in one place,
  // and drops a week entirely once nothing in it matches.
  const sections = useMemo(() => {
    const activities = state.status === 'ready' ? state.items : [];
    const term = query.trim().toLowerCase();
    const matching = term
      ? activities.filter(activity => activity.title.toLowerCase().includes(term))
      : activities;

    return toActivityWeeks(matching, planLabel);
  }, [state, query, planLabel]);

  /* Held rather than rendered-then-swapped — see the other tabs at this point. */
  if (!preferencesReady) {
    return null;
  }

  if (alternateUi) {
    const term = query.trim();

    return (
      <AltActivitiesScreen
        model={{
          query,
          onQueryChange: setQuery,
          weeks: sections.map(section => ({
            id: section.id,
            range: section.meta.range,
            plan: section.meta.plan,
            activities: section.data.map(activity => {
              const row = toActivityRowProps(activity, 'metric');

              return {
                id: row.id,
                title: row.title,
                when: row.when,
                icon: row.icon,
                accent: row.accent,
                place: row.place,
                route: row.route,
                stats: row.stats.map(stat => ({
                  label: stat.label,
                  value: stat.value,
                  unit: stat.unit,
                })),
              };
            }),
          })),
          loadingMore: state.status === 'loading' || (state.status === 'ready' && state.loadingMore),
          error: state.status === 'error' ? `Your activities could not be loaded. ${state.message}` : null,
          /* Only once a read has succeeded and still produced nothing: saying
             "no activities yet" while the first page is in flight is a lie. */
          emptyMessage:
            state.status === 'ready' && sections.length === 0
              ? term
                ? `No activities match \u201C${term}\u201D.`
                : 'No activities yet.'
              : null,
          onEndReached: loadMore,
        }}
      />
    );
  }

  return (
    <SectionScreen
      sections={sections}
      keyExtractor={activity => activity.id}
      renderItem={activity => <ActivityRow activity={toActivityRowProps(activity, 'metric')} />}
      onEndReached={loadMore}
      renderHeader={section => (
        <View style={styles.rangeBlock}>
          <View style={styles.rangeRow}>
            <ThemedText style={styles.range}>{section.meta.range}</ThemedText>
            <View style={styles.rangeMeta}>
              <Icon name="clock" size={15} tintColor={Accents.info} />
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
              <Icon name="magnifyingglass" size={20} tintColor={theme.textSecondary} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="List options"
              hitSlop={Spacing.two}
              style={({ pressed }) => pressed && styles.pressed}>
              <Icon name="ellipsis" size={18} tintColor={theme.text} />
            </Pressable>
          </View>
        </View>
      }
      ListFooterComponent={<ListFooter state={state} query={query} />}>
    </SectionScreen>
  );
}

/**
 * The foot of the list: a spinner while a further page is on its way, the
 * failure if the first read failed, and the no-matches line otherwise.
 */
function ListFooter({
  state,
  query,
}: {
  state: ReturnType<typeof useActivities>['state'];
  query: string;
}) {
  if (state.status === 'error') {
    return (
      <ThemedText themeColor="textSecondary" style={styles.empty}>
        Your activities could not be loaded. {state.message}
      </ThemedText>
    );
  }

  if (state.status === 'loading' || state.loadingMore) {
    return <ActivityIndicator style={styles.footerSpinner} />;
  }

  if (state.items.length === 0) {
    return (
      <ThemedText themeColor="textSecondary" style={styles.empty}>
        {query.trim() ? `No activities match \u201C${query.trim()}\u201D.` : 'No activities yet.'}
      </ThemedText>
    );
  }

  return null;
}

function ActivityRow({ activity }: { activity: ActivityRowProps }) {
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
              <Icon key={mark.icon} name={mark.icon} size={14} tintColor={mark.accent} />
            ))}
          </View>
        </View>

        <View style={styles.titleRow}>
          <Icon name={activity.icon} size={20} tintColor={activity.accent} />
          <ThemedText style={styles.title} numberOfLines={1}>
            {activity.title}
          </ThemedText>
        </View>

        {activity.place ? (
          <View style={styles.placeRow}>
            <Icon name="mappin.and.ellipse" size={13} tintColor={theme.textSecondary} />
            <ThemedText themeColor="textSecondary" style={styles.place}>
              {activity.place.toUpperCase()}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.stats}>
          {activity.stats.map(stat => (
            <View key={stat.icon + stat.value} style={styles.stat}>
              <Icon name={stat.icon} size={15} tintColor={stat.accent} />
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
  footerSpinner: {
    paddingVertical: Spacing.four,
  },
  empty: {
    textAlign: 'center',
    fontSize: 15,
  },
});
