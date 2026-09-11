/**
 * The Activities tab, rebuilt on gluestack-ui.
 *
 * Same activities, same weekly grouping, same search. What changes:
 *
 * - A week is one `Card` of divider-separated rows rather than a run of
 *   separately-bordered cards under a pinned header. The week's range and its
 *   plan week sit above it as a label, so the group reads as a block rather
 *   than as a header that happens to precede some rows.
 * - The route thumbnail shrinks and moves beside the title rather than leading
 *   a tall card. It is a shape, not a map, and at this size it still says
 *   "this one was a loop" without claiming to be navigable.
 * - Figures become value-over-label stats, the same treatment the Dashboard
 *   gives a session's numbers, so the two tabs agree on how a number looks.
 *
 * Presentational only: the route file owns the state, the query and paging.
 */
import type { SFSymbol } from 'expo-symbols';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { SearchIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { Icon as SymbolIcon } from '@/components/icon';
import { RouteLine } from '@/components/route-line';
import { AccentFillOpacity, BottomTabInset } from '@/constants/theme';
import { AltScreenBackground } from './screen-background';

/** Small enough to read as a mark beside the title rather than as a map. */
const ThumbSize = 44;

export type AltActivity = {
  id: string;
  title: string;
  when: string;
  icon: SFSymbol;
  accent: string;
  place?: string;
  route?: { x: number; y: number }[];
  stats: { label: string; value: string; unit?: string }[];
};

export type AltActivityWeek = {
  id: string;
  /** "Sep 7 - 13". */
  range: string;
  /** "Prep Plan Week 2", or empty outside every plan. */
  plan: string;
  activities: AltActivity[];
};

export type AltActivitiesModel = {
  query: string;
  onQueryChange: (query: string) => void;
  weeks: AltActivityWeek[];
  /** A spinner at the foot while a further page is on its way. */
  loadingMore: boolean;
  /** Said plainly rather than left looking like an empty history. */
  error: string | null;
  /** Shown when nothing matches, worded for whether a search is running. */
  emptyMessage: string | null;
  onEndReached: () => void;
};

export function AltActivitiesScreen({ model }: { model: AltActivitiesModel }) {
  const insets = useSafeAreaInsets();

  return (
    <AltScreenBackground>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 gap-5"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        /* Paging on a plain scroller rather than a list: this screen's rows are
           grouped into cards per week, which a `SectionList` would have to
           rebuild as headers and rows again. The history is a few hundred rows
           at most, so the virtualisation is not worth the shape it forces. */
        scrollEventThrottle={16}
        onScroll={event => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 400) {
            model.onEndReached();
          }
        }}>
        {/* `h-11` over the component's own `min-h-9`: a search field is a
            touch target before it is a text box, and 36pt is under the 44pt
            minimum. Padding and gap come from the component. */}
        <Input className="h-11">
          <InputSlot>
            <InputIcon as={SearchIcon} />
          </InputSlot>
          <InputField
            value={model.query}
            onChangeText={model.onQueryChange}
            placeholder="Search activities"
            accessibilityLabel="Search activities"
            returnKeyType="search"
            autoCorrect={false}
          />
        </Input>

        {model.error ? (
          <Text size="sm" className="text-destructive text-center" accessibilityRole="alert">
            {model.error}
          </Text>
        ) : null}

        {model.weeks.map(week => (
          <Week key={week.id} week={week} />
        ))}

        {model.emptyMessage ? (
          <Text size="sm" className="text-muted-foreground text-center">
            {model.emptyMessage}
          </Text>
        ) : null}

        {model.loadingMore ? <ActivityIndicator /> : null}

        {/* The tab bar floats over the scroller. See `alt/profile-screen.tsx`. */}
        <View style={{ height: insets.bottom + BottomTabInset }} />
      </ScrollView>
    </AltScreenBackground>
  );
}

function Week({ week }: { week: AltActivityWeek }) {
  return (
    <VStack space="sm">
      <HStack space="sm" className="items-baseline px-1">
        <Text size="sm" className="text-foreground font-semibold">
          {week.range}
        </Text>
        {week.plan ? (
          <Text size="xs" className="text-muted-foreground">
            {week.plan}
          </Text>
        ) : null}
      </HStack>

      <Card size="sm" className="gap-0 px-0 py-0">
        {week.activities.map((activity, index) => (
          <View key={activity.id}>
            {/* Between rows rather than after each, so the card does not end on
                a rule against its own border. */}
            {index > 0 ? <Divider className="ml-16" /> : null}
            <Row activity={activity} />
          </View>
        ))}
      </Card>
    </VStack>
  );
}

function Row({ activity }: { activity: AltActivity }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${activity.title}. ${activity.when}`}
      className="px-3 py-3">
      <HStack space="md" className="items-start">
        {/* The route where there is one, the discipline symbol where there is
            not — the same slot either way, so rows stay aligned down the card. */}
        <Box
          className="size-11 items-center justify-center overflow-hidden rounded-full"
          style={{ backgroundColor: `${activity.accent}${AccentFillOpacity}` }}>
          {activity.route ? (
            <RouteLine
              points={activity.route}
              width={ThumbSize}
              height={ThumbSize}
              color={activity.accent}
              stroke={2}
            />
          ) : (
            <SymbolIcon name={activity.icon} size={20} tintColor={activity.accent} />
          )}
        </Box>

        <VStack space="xs" className="flex-1">
          <Text className="text-foreground font-medium">{activity.title}</Text>

          <Text size="xs" className="text-muted-foreground">
            {activity.when}
            {activity.place ? ` · ${activity.place}` : ''}
          </Text>

          {activity.stats.length > 0 ? (
            <HStack space="lg" className="flex-wrap pt-1">
              {activity.stats.map(stat => (
                <VStack key={stat.label}>
                  <Text size="sm" className="text-foreground font-semibold">
                    {stat.value}
                    {stat.unit ? (
                      <Text size="xs" className="text-muted-foreground font-normal">
                        {' '}
                        {stat.unit}
                      </Text>
                    ) : null}
                  </Text>
                  <Text size="2xs" className="text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </Text>
                </VStack>
              ))}
            </HStack>
          ) : null}
        </VStack>
      </HStack>
    </Pressable>
  );
}
