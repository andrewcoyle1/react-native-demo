/**
 * The Trends tab, rebuilt on gluestack-ui.
 *
 * Same figures, same order, same meanings. What changes:
 *
 * - The week's volume leads as a comparison rather than as two columns of
 *   numbers. Planned and completed sit on one bar, so "how much of the week is
 *   done" is read from the shape before any figure is.
 * - Fitness, fatigue and form are one card of three divider-separated columns
 *   rather than three tiles in a row, which is what lets the trend arrow sit
 *   beside its number instead of under it.
 * - Every colour is a semantic token, except the three meanings' accents, which
 *   are fixed in `constants/theme.ts` and mean the same thing in both builds.
 *
 * Presentational only: the route file owns the state and hands it over, so the
 * two builds cannot disagree about what the athlete's form is.
 */
import type { SFSymbol } from 'expo-symbols';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { Icon as SymbolIcon } from '@/components/icon';
import { AccentFillOpacity, BottomTabInset } from '@/constants/theme';
import { AltScreenBackground } from './screen-background';

/** One of the three training-load readings. */
export type AltReading = {
  label: string;
  icon: SFSymbol;
  value: string;
  unit?: string;
  accent: string;
  direction: 'up' | 'down' | 'flat';
};

export type AltTrendsModel = {
  /** "4 hr 30 min" and "112 km", planned and actually done. */
  planned: { time: string; distance: string };
  completed: { time: string; distance: string };
  /** 0–1 of the planned duration completed. Null when nothing is planned. */
  progress: number | null;
  /** Fresh or Loaded, with the accent that reading deserves. */
  formLabel: string;
  formAccent: string;
  load: AltReading[];
  athlete: AltReading[];
  error: string | null;
};

export function AltTrendsScreen({ model }: { model: AltTrendsModel }) {
  const insets = useSafeAreaInsets();

  return (
    <AltScreenBackground>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 gap-5"
        contentInsetAdjustmentBehavior="automatic">
        {model.error ? (
          <Text size="sm" className="text-destructive text-center" accessibilityRole="alert">
            {model.error}
          </Text>
        ) : null}

        <Card>
          <VStack space="md">
            <Text size="xs" className="text-muted-foreground uppercase tracking-widest">
              This week
            </Text>

            {/* Completed leads, planned qualifies it. The standard build gives
                the two equal weight side by side; here the number that already
                happened is the one worth reading first. */}
            <VStack>
              <Heading size="3xl" className="tracking-tight">
                {model.completed.time}
              </Heading>
              <Text size="lg" className="text-muted-foreground">
                of {model.planned.time} planned
              </Text>
            </VStack>

            {model.progress !== null ? (
              <Progress
                value={Math.round(model.progress * 100)}
                accessibilityLabel={`${Math.round(model.progress * 100)}% of the planned week complete`}>
                <ProgressFilledTrack />
              </Progress>
            ) : null}

            <Divider />

            <HStack className="justify-between">
              <Figure label="Distance done" value={model.completed.distance} />
              <Figure label="Distance planned" value={model.planned.distance} align="right" />
            </HStack>
          </VStack>
        </Card>

        <Readings title="Fitness, fatigue & form" badge={model.formLabel} badgeAccent={model.formAccent} readings={model.load} />
        <Readings title="Run threshold & VO2 max" readings={model.athlete} />

        {/* The tab bar floats over the scroller. See `alt/profile-screen.tsx`. */}
        <View style={{ height: insets.bottom + BottomTabInset }} />
      </ScrollView>
    </AltScreenBackground>
  );
}

/** A card of readings, side by side and separated by rules. */
function Readings({
  title,
  badge,
  badgeAccent,
  readings,
}: {
  title: string;
  badge?: string;
  badgeAccent?: string;
  readings: AltReading[];
}) {
  if (readings.length === 0) {
    return null;
  }

  return (
    <VStack space="sm">
      <HStack className="items-center justify-between gap-3 px-1">
        <Text size="xs" className="text-muted-foreground uppercase tracking-wider">
          {title}
        </Text>
        {badge ? (
          /* The state's own colour rather than a token: "Fresh" being green and
             "Loaded" being blue is the reading, not decoration. */
          <Text size="xs" className="uppercase tracking-wider" style={{ color: badgeAccent }}>
            {badge}
          </Text>
        ) : null}
      </HStack>

      <Card size="sm">
        <HStack className="items-stretch">
          {readings.map((reading, index) => (
            <View key={reading.label} className="flex-1 flex-row">
              {index > 0 ? <Divider orientation="vertical" className="mx-2" /> : null}
              <Reading reading={reading} />
            </View>
          ))}
        </HStack>
      </Card>
    </VStack>
  );
}

function Reading({ reading }: { reading: AltReading }) {
  return (
    <VStack space="xs" className="flex-1 items-center py-1">
      <View
        className="size-9 items-center justify-center rounded-full"
        style={{ backgroundColor: `${reading.accent}${AccentFillOpacity}` }}>
        <SymbolIcon name={reading.icon} size={16} tintColor={reading.accent} />
      </View>

      <HStack space="xs" className="items-baseline">
        <Text size="xl" className="text-foreground font-semibold">
          {reading.value}
        </Text>
        {reading.unit ? (
          <Text size="xs" className="text-muted-foreground">
            {reading.unit}
          </Text>
        ) : null}
        <SymbolIcon
          name={arrowFor(reading.direction)}
          size={12}
          tintColor={reading.direction === 'flat' ? undefined : reading.accent}
        />
      </HStack>

      <Text size="2xs" className="text-muted-foreground uppercase tracking-wider text-center">
        {reading.label}
      </Text>
    </VStack>
  );
}

function Figure({
  label,
  value,
  align = 'left',
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
}) {
  return (
    <VStack className={align === 'right' ? 'items-end' : undefined}>
      <Text className="text-foreground font-semibold">{value}</Text>
      <Text size="2xs" className="text-muted-foreground uppercase tracking-wider">
        {label}
      </Text>
    </VStack>
  );
}

/** The same three glyphs `StatTile` uses, so a trend reads alike in both builds. */
function arrowFor(direction: AltReading['direction']): SFSymbol {
  if (direction === 'up') {
    return 'arrow.up';
  }
  if (direction === 'down') {
    return 'arrow.down';
  }
  return 'arrow.right';
}
