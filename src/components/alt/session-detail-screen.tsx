/**
 * The workout detail sheet, rebuilt on gluestack-ui.
 *
 * Same session, same two halves. What changes:
 *
 * - **The tab switch moves from the foot of the sheet to under the title.** The
 *   standard build floats a glass pill over the scroller, which works because
 *   the glass keeps the content legible behind it. This build has no glass: a
 *   solid pill parked over the last card reads as a stuck modal footer rather
 *   than a control. Under the header it reads as what it is — two views of one
 *   session — and leaves the card stack a free bottom edge.
 * - **Figures are value-over-label with no icon rings.** The ring repeats what
 *   the label already says, and these are the numbers being scanned; the
 *   Dashboard's alternate build made the same call for the same reason.
 * - **Chips become neutral outline badges.** The alternate build says things
 *   with hierarchy rather than hue, and a row of tinted capsules over a flat
 *   card is the loudest thing on the screen for the least reason.
 * - **A repeat becomes an indented card with a rule down its leading edge**
 *   rather than a tinted box inside a tinted box. Nesting three deep, tint on
 *   tint stops separating anything; an indent still does.
 * - **RPE is a progress bar.** gluestack ships one, and "5 out of 10" is
 *   literally a progress value — the standard build can only say it in words.
 *
 * Two things are *not* rebuilt. The set labels keep their accent, because that
 * colour is what ties a set in the list to its band on the chart above — it is
 * meaning, not decoration. And the three charts are reused as they are, for the
 * reason `alt/plan-screen.tsx` reuses `ProgressRing`: a component library has
 * no opinion about an interval plot, and rebuilding one would be inventing a
 * second way to say the same thing.
 *
 * Presentational only. The route owns the session, the activity and the tab.
 */
import type { SFSymbol } from 'expo-symbols';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { Icon as SymbolIcon } from '@/components/icon';
import {
  IntervalChart,
  type IntervalBand,
  type IntervalSegment,
} from '@/components/interval-chart';
import { LapsChart, type LapBar } from '@/components/laps-chart';
import { RouteLine, type RoutePoint } from '@/components/route-line';
import { StreamChart, type StreamPoint } from '@/components/stream-chart';
import type { StepProps, StepRestProps, WorkoutSetProps } from '@/components/workout-steps';
import { Spacing } from '@/constants/theme';
import { AltScreenBackground } from './screen-background';

/** One figure, already formatted. */
export type AltDetailMetric = { label: string; value: string; unit?: string };

/*
 * The step vocabulary is shared rather than restated. A repeat containing two
 * efforts is a fact about the workout, not about how either build draws one,
 * and a recursive type declared twice is a recursive type that drifts.
 */
export type AltStep = StepProps;
export type AltStepRest = StepRestProps;
export type AltWorkoutSet = WorkoutSetProps;

export type AltConnection = {
  title: string;
  subtitle: string | null;
  accent: string;
};

export type AltStreamChart = {
  kind: string;
  title: string;
  badge: string;
  color: string;
  points: StreamPoint[];
  yLabels: string[];
  xLabels: string[];
  min: number;
  max: number;
  average: number;
  invert: boolean;
};

export type AltSessionDetailModel = {
  /** "MON, SEP 14". */
  dateLine: string;
  title: string;
  icon: SFSymbol;
  iconAccent: string;
  completed: boolean;
  tab: 'planned' | 'completed';
  onTab: (tab: 'planned' | 'completed') => void;
  /** False while there is no recorded activity — the tab is shown but inert. */
  hasCompleted: boolean;
  onClose: () => void;

  planned: {
    tags: string[];
    metrics: AltDetailMetric[];
    footnote: string | null;
    segments: IntervalSegment[];
    bands: IntervalBand[];
    totalMinutes: number;
    tickEvery?: number;
    coach: { name: string; note: string } | null;
    sets: AltWorkoutSet[];
    connections: AltConnection[];
  };

  /** Null until the session has been done. */
  recorded: {
    title: string;
    route: RoutePoint[];
    metrics: AltDetailMetric[];
    /** 1-10, or null when the athlete has not rated it. */
    rpe: number | null;
    laps: LapBar[];
    lapAxis: string[];
    lapUnit: string;
    lapCount: number;
    charts: AltStreamChart[];
    onUncomplete: () => void;
    busy: boolean;
  } | null;
};

export function AltSessionDetailScreen({ model }: { model: AltSessionDetailModel }) {
  const insets = useSafeAreaInsets();

  return (
    <AltScreenBackground>
      {/* Header and switch sit above the scroller rather than in it: the tab
          control is how the athlete moves between the two halves, and scrolling
          it away would hide the way back. */}
      <VStack space="sm" className="px-4 pt-3">
        <Header model={model} />
        <TabSwitch model={model} />
      </VStack>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pt-4 gap-4">
        {model.tab === 'planned' ? (
          <PlannedTab model={model} />
        ) : model.recorded ? (
          <CompletedTab recorded={model.recorded} />
        ) : null}

        <View style={{ height: insets.bottom + Spacing.five }} />
      </ScrollView>
    </AltScreenBackground>
  );
}

function Header({ model }: { model: AltSessionDetailModel }) {
  return (
    <VStack space="xs">
      <HStack className="items-center justify-between">
        <Text size="2xs" className="text-muted-foreground uppercase tracking-wider">
          {model.dateLine}
        </Text>

        <Pressable
          onPress={model.onClose}
          accessibilityRole="button"
          accessibilityLabel={`Close ${model.title}`}
          className="size-8 items-center justify-center rounded-full">
          <Text size="lg" className="text-muted-foreground">
            ✕
          </Text>
        </Pressable>
      </HStack>

      <HStack space="sm" className="items-start">
        {/* The symbol keeps the discipline's accent — it is the one place the
            sport is named without words. */}
        <SymbolIcon
          name={model.icon}
          size={22}
          tintColor={model.iconAccent}
          style={{ marginTop: 4 }}
        />

        <Heading size="xl" className="flex-1 tracking-tight">
          {model.title}
        </Heading>

        {/* A badge rather than the standard build's inline capital run: this
            build already says status in badges everywhere else. */}
        {model.completed ? (
          <Badge variant="secondary" className="mt-1">
            <BadgeText>Done</BadgeText>
          </Badge>
        ) : null}
      </HStack>
    </VStack>
  );
}

function TabSwitch({ model }: { model: AltSessionDetailModel }) {
  const tabs = [
    { value: 'planned' as const, label: 'Planned', enabled: true },
    { value: 'completed' as const, label: 'Completed', enabled: model.hasCompleted },
  ];

  return (
    <HStack className="rounded-lg bg-muted p-1">
      {tabs.map(tab => {
        const selected = tab.value === model.tab;

        return (
          <Pressable
            key={tab.value}
            onPress={tab.enabled ? () => model.onTab(tab.value) : undefined}
            disabled={!tab.enabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !tab.enabled }}
            accessibilityLabel={tab.label}
            className={`flex-1 items-center justify-center rounded-md py-2 ${
              selected ? 'bg-background' : ''
            } ${tab.enabled ? '' : 'opacity-40'}`}>
            <Text
              size="sm"
              className={selected ? 'text-foreground font-semibold' : 'text-muted-foreground'}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}

/** Value over label, the treatment the alternate Dashboard already uses. */
function Metrics({ metrics }: { metrics: AltDetailMetric[] }) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <HStack space="lg" className="flex-wrap">
      {metrics.map(metric => (
        <VStack key={metric.label}>
          <Text size="md" className="text-foreground font-semibold">
            {metric.value}
            {metric.unit ? (
              <Text size="xs" className="text-muted-foreground font-normal">
                {' '}
                {metric.unit}
              </Text>
            ) : null}
          </Text>
          <Text size="2xs" className="text-muted-foreground uppercase tracking-wider">
            {metric.label}
          </Text>
        </VStack>
      ))}
    </HStack>
  );
}

function PlannedTab({ model }: { model: AltSessionDetailModel }) {
  const { planned } = model;

  return (
    <>
      <Card size="sm">
        <VStack space="md">
          {planned.tags.length > 0 ? (
            <HStack space="xs" className="flex-wrap">
              {planned.tags.map(tag => (
                <Badge key={tag} variant="outline">
                  <BadgeText>{tag}</BadgeText>
                </Badge>
              ))}
            </HStack>
          ) : null}

          <Metrics metrics={planned.metrics} />

          {planned.footnote ? (
            <Text size="2xs" className="text-muted-foreground">
              {planned.footnote}
            </Text>
          ) : null}

          {planned.segments.length > 0 ? (
            <>
              <Divider />
              <IntervalChart
                segments={planned.segments}
                bands={planned.bands}
                totalMinutes={planned.totalMinutes}
                tickEvery={planned.tickEvery}
                height={64}
              />
            </>
          ) : null}
        </VStack>
      </Card>

      {planned.coach ? <CoachCard coach={planned.coach} /> : null}

      {planned.sets.length > 0 ? (
        <VStack space="sm">
          <SectionLabel>Workout steps</SectionLabel>
          {planned.sets.map(set => (
            <WorkoutSetBlock key={set.id} set={set} />
          ))}
        </VStack>
      ) : null}

      {planned.connections.length > 0 ? (
        <VStack space="sm">
          <SectionLabel>Connections</SectionLabel>
          {planned.connections.map(connection => (
            <Card key={connection.title} size="sm">
              <VStack space="xs">
                <Text size="sm" className="font-medium" style={{ color: connection.accent }}>
                  {connection.title}
                </Text>
                {connection.subtitle ? (
                  <Text size="xs" className="text-muted-foreground">
                    {connection.subtitle}
                  </Text>
                ) : null}
              </VStack>
            </Card>
          ))}
        </VStack>
      ) : null}
    </>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text size="xs" className="text-muted-foreground uppercase tracking-wider px-1">
      {children}
    </Text>
  );
}

function CoachCard({ coach }: { coach: { name: string; note: string } }) {
  return (
    <Card size="sm">
      <VStack space="sm">
        <HStack space="sm" className="items-center">
          <Avatar className="size-8">
            <AvatarFallbackText>{coach.name}</AvatarFallbackText>
          </Avatar>
          <Text size="sm" className="text-foreground font-medium">
            {coach.name}
          </Text>
        </HStack>

        {/* Shown whole rather than clamped. The standard card collapses it
            because it sits in a list of other sessions; here the athlete opened
            this one session, and hiding the coaching behind a tap would be
            withholding the thing they came for. */}
        <Text size="sm" className="text-muted-foreground">
          {coach.note}
        </Text>
      </VStack>
    </Card>
  );
}

function WorkoutSetBlock({ set }: { set: AltWorkoutSet }) {
  return (
    <VStack space="xs">
      <Badge variant="outline" className="self-start" style={{ borderColor: set.accent }}>
        <BadgeText style={{ color: set.accent }}>{set.label}</BadgeText>
      </Badge>

      <Card size="sm">
        <VStack space="sm">
          {set.steps.map((step, index) => (
            <VStack key={step.id} space="sm">
              {index > 0 ? <Divider /> : null}
              <StepBlock step={step} accent={set.accent} />
            </VStack>
          ))}
        </VStack>
      </Card>
    </VStack>
  );
}

/**
 * One step, of either kind.
 *
 * Recursive, because the workout is: a swim main set is three rounds of two
 * rounds of a length, and flattening that to twelve identical lines would be a
 * different instruction from the one the coach wrote.
 */
function StepBlock({ step, accent }: { step: AltStep; accent: string }) {
  if (step.kind === 'repeat') {
    return (
      <VStack space="xs">
        <Text size="xs" className="text-muted-foreground italic">
          {step.label}
        </Text>

        {/* The indent and the rule are the whole nesting cue. A tinted box
            inside a tinted box stops separating anything by the third level. */}
        <VStack space="sm" className="border-l-2 pl-3" style={{ borderLeftColor: `${accent}55` }}>
          {step.children.map(child => (
            <StepBlock key={child.id} step={child} accent={accent} />
          ))}
        </VStack>

        {step.rest ? <Rest rest={step.rest} /> : null}
      </VStack>
    );
  }

  return (
    <VStack space="xs">
      <Text size="sm" className="text-foreground">
        <Text size="md" className="text-foreground font-semibold italic">
          {step.quantity}
        </Text>{' '}
        <Text size="sm" className={step.hasVideo ? 'underline' : ''}>
          {step.name}
        </Text>
        {step.zone ? (
          <Text size="sm" className="text-muted-foreground">
            {' at '}
          </Text>
        ) : null}
        {step.zone ? (
          <Text size="sm" className="font-medium" style={{ color: accent }}>
            {step.zone}
          </Text>
        ) : null}
      </Text>

      {step.parts.length > 0 ? (
        <VStack space="xs" className="pl-4">
          {step.parts.map(part => (
            <StepBlock key={part.id} step={part} accent={accent} />
          ))}
        </VStack>
      ) : null}

      {step.note ? (
        <Text size="xs" className="text-muted-foreground">
          {step.note}
        </Text>
      ) : null}

      {step.equipment.length > 0 ? (
        <HStack space="xs" className="flex-wrap">
          {step.equipment.map(item => (
            <Badge key={item} variant="outline">
              <BadgeText>{item}</BadgeText>
            </Badge>
          ))}
        </HStack>
      ) : null}

      {step.rest ? <Rest rest={step.rest} /> : null}
    </VStack>
  );
}

function Rest({ rest }: { rest: AltStepRest }) {
  return (
    <Badge variant={rest.open ? 'outline' : 'secondary'} className="self-start">
      <BadgeText>{rest.label}</BadgeText>
    </Badge>
  );
}

function CompletedTab({ recorded }: { recorded: NonNullable<AltSessionDetailModel['recorded']> }) {
  return (
    <>
      <Card size="sm">
        <VStack space="md">
          <Text size="xs" className="text-muted-foreground">
            {recorded.title}
          </Text>

          {recorded.route.length > 1 ? (
            <RouteLine
              points={recorded.route}
              width={280}
              height={140}
              color="#D4A72C"
              stroke={3}
            />
          ) : null}

          <Metrics metrics={recorded.metrics} />

          {recorded.rpe !== null ? (
            <>
              <Divider />
              <VStack space="xs">
                <HStack className="items-baseline justify-between">
                  <Text size="xs" className="text-muted-foreground uppercase tracking-wider">
                    Perceived effort
                  </Text>
                  <Text size="sm" className="text-foreground font-semibold">
                    {recorded.rpe}
                    <Text size="xs" className="text-muted-foreground font-normal">
                      {' '}
                      / 10
                    </Text>
                  </Text>
                </HStack>

                {/* The one place this build says something the standard one
                    cannot: an effort out of ten is a proportion, and gluestack
                    ships the bar for it. */}
                <Progress value={recorded.rpe * 10} className="h-2">
                  <ProgressFilledTrack />
                </Progress>
              </VStack>
            </>
          ) : null}
        </VStack>
      </Card>

      {recorded.laps.length > 1 ? (
        <Card size="sm">
          <VStack space="md">
            <HStack className="items-center justify-between">
              <Text size="sm" className="text-foreground font-medium">
                Laps
              </Text>
              <Badge variant="outline">
                <BadgeText>{`${recorded.lapCount} total`}</BadgeText>
              </Badge>
            </HStack>

            <LapsChart
              bars={recorded.laps}
              yLabels={recorded.lapAxis}
              unitLabel={recorded.lapUnit}
              color="#D4A72C"
            />
          </VStack>
        </Card>
      ) : null}

      {recorded.charts.map(chart => (
        <Card key={chart.kind} size="sm">
          <VStack space="md">
            <HStack className="items-center justify-between">
              <Text size="sm" className="text-foreground font-medium">
                {chart.title}
              </Text>
              <Badge variant="outline">
                <BadgeText>{chart.badge}</BadgeText>
              </Badge>
            </HStack>

            <StreamChart
              points={chart.points}
              color={chart.color}
              yLabels={chart.yLabels}
              xLabels={chart.xLabels}
              min={chart.min}
              max={chart.max}
              average={chart.average}
              invert={chart.invert}
            />
          </VStack>
        </Card>
      ))}

      <Button
        /* `destructive` rather than an outline tinted red by hand: undoing a
           completion is exactly what this build's destructive variant is for,
           and inventing a colour for it would be reaching past the library. */
        variant="destructive"
        onPress={recorded.onUncomplete}
        isDisabled={recorded.busy}
        accessibilityLabel="Uncomplete workout">
        <ButtonText>Uncomplete workout</ButtonText>
      </Button>
    </>
  );
}
