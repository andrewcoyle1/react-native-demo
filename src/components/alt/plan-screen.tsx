/**
 * The Plan tab's week, rebuilt on gluestack-ui.
 *
 * Same week, same stepper, same rows. What changes:
 *
 * - The three discipline rings become three progress bars in one card. A ring
 *   is a beautiful way to show one figure and an awkward way to compare three:
 *   side by side, bars put the week's shortfall on a common axis, and the
 *   figures can sit on the same line as the label rather than beneath the ring.
 * - A day is one `Card` of divider-separated rows rather than a date gutter
 *   with a connector running down it. The weekday leads the card's own label
 *   line instead, which is what lets the rows start at the card's edge.
 * - A completed or missed session is said in a badge rather than by a disc
 *   straddling the card's leading edge — the disc needs the gutter this layout
 *   no longer has.
 *
 * The week-swipe gesture is *not* here. It lives in the route file and wraps
 * whichever build is showing, so both get the same swipe from one
 * implementation rather than two that have to be kept agreeing.
 *
 * Presentational only: the route file owns the week, the plan and the data.
 */
import type { SFSymbol } from 'expo-symbols';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { ChevronLeftIcon, ChevronRightIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { Icon as SymbolIcon } from '@/components/icon';
import { ProgressRing } from '@/components/progress-ring';
import { AccentFillOpacity, Accents, BottomTabInset } from '@/constants/theme';
import { AltScreenBackground } from './screen-background';

/** One discipline's volume for the week. */
export type AltVolume = {
  id: string;
  icon: SFSymbol;
  accent: string;
  /** "1 hr 57 min" done against "3 hr" planned. */
  done: string;
  planned: string;
  progress: number;
};

export type AltPlanItem = {
  id: string;
  title: string;
  icon: SFSymbol;
  accent: string;
  /** The planned figures, under the title. */
  target: string;
  status: 'done' | 'missed' | 'none';
  commitment?: boolean;
  /** What was actually recorded against it, once something has been. */
  actual?: { at: string; title: string; stats: string[] };
};

export type AltPlanDay = {
  id: string;
  /** "MON". */
  weekday: string;
  /** "8". */
  day: string;
  items: AltPlanItem[];
};

export type AltPlanModel = {
  /** "PREP plan", or empty before the plan has loaded. */
  planLabel: string;
  /** "BASE phase", or empty. */
  phaseLabel: string;
  /** "Week 3", and "of 24". */
  weekLabel: string;
  weeksLabel: string;
  /** "2020  SEP" — the month the week begins in. */
  monthLabel: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onStep: (direction: number) => void;
  volumes: AltVolume[];
  /** The week's three rings added together. */
  total: { done: string; planned: string };
  days: AltPlanDay[];
};

export function AltPlanScreen({ model }: { model: AltPlanModel }) {
  const insets = useSafeAreaInsets();

  return (
    <AltScreenBackground>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 gap-5"
        contentInsetAdjustmentBehavior="automatic">
        <WeekStepper model={model} />
        <Volumes model={model} />

        {model.days.length === 0 ? (
          <Text size="sm" className="text-muted-foreground text-center">
            Nothing scheduled this week.
          </Text>
        ) : (
          <VStack space="sm">
            <Text size="xs" className="text-muted-foreground uppercase tracking-wider px-1">
              {model.monthLabel}
            </Text>
            {model.days.map(day => (
              <Day key={day.id} day={day} />
            ))}
          </VStack>
        )}

        {/* The tab bar floats over the scroller. See `alt/profile-screen.tsx`. */}
        <View style={{ height: insets.bottom + BottomTabInset }} />
      </ScrollView>
    </AltScreenBackground>
  );
}

/**
 * Which week, and the two arrows that change it.
 *
 * The arrows flank a centred block so the week number stays put as the labels
 * either side of it change length — the same reasoning the standard build's
 * stepper follows, because it is a property of the layout rather than of how
 * it is built.
 */
function WeekStepper({ model }: { model: AltPlanModel }) {
  return (
    <HStack className="items-center justify-between">
      <StepButton
        direction={-1}
        enabled={model.canGoBack}
        onPress={model.onStep}
        label="Previous week"
      />

      <VStack className="items-center">
        {model.planLabel ? (
          <Text size="xs" className="uppercase tracking-wider" style={{ color: Accents.info }}>
            {model.planLabel}
          </Text>
        ) : null}

        <HStack space="xs" className="items-baseline">
          <Heading size="xl">{model.weekLabel}</Heading>
          <Text className="text-muted-foreground">{model.weeksLabel}</Text>
        </HStack>

        {model.phaseLabel ? (
          <Text size="xs" className="uppercase tracking-wider" style={{ color: Accents.speed }}>
            {model.phaseLabel}
          </Text>
        ) : null}
      </VStack>

      <StepButton
        direction={1}
        enabled={model.canGoForward}
        onPress={model.onStep}
        label="Next week"
      />
    </HStack>
  );
}

function StepButton({
  direction,
  enabled,
  onPress,
  label,
}: {
  direction: number;
  enabled: boolean;
  onPress: (direction: number) => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={enabled ? () => onPress(direction) : undefined}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      className={`size-10 items-center justify-center rounded-full ${enabled ? '' : 'opacity-30'}`}>
      <Icon
        as={direction === 1 ? ChevronRightIcon : ChevronLeftIcon}
        size="lg"
        className="text-muted-foreground"
      />
    </Pressable>
  );
}

/**
 * The week's volume, one ring per discipline, over the three added together.
 *
 * Rings rather than bars, and rather than anything gluestack ships: this is the
 * figure the tab exists for, and the standard build draws it as an arc around
 * the discipline's own symbol. A component library has no opinion about that
 * shape, and `ProgressRing` already draws it in four views — so the alternate
 * build reuses it rather than inventing a second way to say the same thing.
 * The card, the labels and the total around it are gluestack.
 */
function Volumes({ model }: { model: AltPlanModel }) {
  if (model.volumes.length === 0) {
    return null;
  }

  return (
    <Card size="sm">
      <VStack space="md">
        <HStack className="justify-around">
          {model.volumes.map(volume => (
            <VStack key={volume.id} space="xs" className="items-center">
              <ProgressRing
                progress={volume.progress}
                color={volume.accent}
                size={84}
                stroke={7}>
                <SymbolIcon name={volume.icon} size={30} tintColor={volume.accent} />
              </ProgressRing>

              {/* Digits at full contrast, units quiet beside them — the same
                  split the standard build makes, because the number is what is
                  being read and the unit only qualifies it. */}
              <Text size="sm" className="text-foreground font-semibold">
                {withUnits(volume.done)}
              </Text>
              <Text size="2xs" className="text-muted-foreground uppercase tracking-wider">
                {volume.planned}
              </Text>
            </VStack>
          ))}
        </HStack>

        <Divider />

        <HStack className="items-baseline justify-between">
          <Text size="xs" className="text-muted-foreground uppercase tracking-wider">
            Total
          </Text>
          <Text size="sm" className="text-foreground font-medium">
            {model.total.done}
            <Text size="xs" className="text-muted-foreground font-normal">
              {' '}
              of {model.total.planned}
            </Text>
          </Text>
        </HStack>
      </VStack>
    </Card>
  );
}

/**
 * Renders "1 hr 57 min" with the digits at full contrast and the units quiet.
 *
 * Splitting on whitespace is enough: every token is either a number or the unit
 * that follows it, and the unit is whatever is not a number. The same rule the
 * standard build's `withUnits` follows.
 */
function withUnits(text: string) {
  return text.split(' ').map((token, index) =>
    /\d/.test(token) ? (
      <Text key={index} size="sm" className="text-foreground font-semibold">
        {index > 0 ? ' ' : ''}
        {token}
      </Text>
    ) : (
      <Text key={index} size="2xs" className="text-muted-foreground">
        {' '}
        {token.toUpperCase()}
      </Text>
    ),
  );
}

function Day({ day }: { day: AltPlanDay }) {
  return (
    <VStack space="sm">
      <HStack space="sm" className="items-baseline px-1">
        <Text size="sm" className="text-foreground font-semibold">
          {day.weekday}
        </Text>
        <Text size="xs" className="text-muted-foreground">
          {day.day}
        </Text>
      </HStack>

      <Card size="sm" className="gap-0 px-0 py-0">
        {day.items.map((item, index) => (
          <View key={item.id}>
            {index > 0 ? <Divider className="ml-16" /> : null}
            <Item item={item} />
          </View>
        ))}
      </Card>
    </VStack>
  );
}

function Item({ item }: { item: AltPlanItem }) {
  return (
    <VStack space="xs" className="px-3 py-3">
      <HStack space="md" className="items-start">
        <Box
          className="size-11 items-center justify-center rounded-full"
          style={{ backgroundColor: `${item.accent}${AccentFillOpacity}` }}>
          <SymbolIcon name={item.icon} size={20} tintColor={item.accent} />
        </Box>

        <VStack space="xs" className="flex-1">
          <HStack space="sm" className="items-start">
            <Text className="flex-1 text-foreground font-medium">{item.title}</Text>
            <StatusBadge status={item.status} />
          </HStack>

          <Text size="sm" className="text-muted-foreground">
            {item.target}
          </Text>

          {item.commitment ? (
            <Badge variant="outline" className="self-start">
              <BadgeText>Commitment</BadgeText>
            </Badge>
          ) : null}

          {/* What was actually recorded, indented under what was asked for. */}
          {item.actual ? (
            <VStack space="xs" className="pt-1">
              <Text size="xs" style={{ color: Accents.schedule }}>
                {item.actual.at} · {item.actual.title}
              </Text>
              <HStack space="md" className="flex-wrap">
                {item.actual.stats.map(stat => (
                  <Text key={stat} size="xs" className="text-muted-foreground">
                    {stat}
                  </Text>
                ))}
              </HStack>
            </VStack>
          ) : null}
        </VStack>
      </HStack>
    </VStack>
  );
}

/**
 * Done, missed, or nothing yet.
 *
 * The standard build says this with a coloured disc straddling the card's
 * leading edge, which needs the date gutter this layout does not have. A badge
 * says the same thing where there is room for it.
 */
function StatusBadge({ status }: { status: AltPlanItem['status'] }) {
  if (status === 'none') {
    return null;
  }

  return (
    <Badge variant={status === 'done' ? 'secondary' : 'destructive'}>
      <BadgeText>{status === 'done' ? 'Done' : 'Missed'}</BadgeText>
    </Badge>
  );
}
