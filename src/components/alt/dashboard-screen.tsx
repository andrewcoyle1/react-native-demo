/**
 * The Dashboard tab, rebuilt on gluestack-ui.
 *
 * The second half of the pilot that `alt/profile-screen.tsx` started, and it
 * follows the same rules: same information, same order, same destinations, a
 * different *construction*.
 *
 * The shape of it:
 *
 * - The plan under way is a hero. One number the size of the screen's whole
 *   point — days to the race — over a week-progress bar carrying the two
 *   figures the standard build's chart exists to convey: where you are in the
 *   plan, and how much of this week is done. Plans not yet started are compact
 *   rows underneath, because an upcoming plan is a fact to note, not a thing
 *   to act on.
 * - A day is one `Card` of sessions, divider-separated, rather than a heading
 *   over a run of separately-bordered workout cards. Each session leads with
 *   its discipline in a tinted round chip, so the eye can find "the swim" by
 *   colour before reading a word.
 * - A session's numbers are a row of value-over-label stats rather than a
 *   sentence of grey text. They are the most scannable thing on the screen and
 *   are set to be read that way.
 *
 * What is deliberately lost: the interval chart. A session's *shape* does not
 * survive this rebuild. That is a real cost of the comparison rather than an
 * oversight, and it is the sort of thing the comparison exists to surface.
 *
 * Presentational only. Every value and handler arrives as a prop from
 * `app/(main)/(dashboard)/index.tsx`, which owns the state for both builds, so
 * the two cannot disagree and this file has nothing to keep in sync.
 *
 * Semantic tokens only, component props before `className`, spacing scale
 * rather than arbitrary values — with one documented exception: the discipline
 * accents, which are fixed colours in `constants/theme.ts` and are no more
 * themeable here than in the standard build.
 */
import { Image } from 'expo-image';
import type { SFSymbol } from 'expo-symbols';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { ChevronRightIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/* The app's SF Symbol renderer. gluestack's icon set has no swim, bike or run
   glyph, and the disciplines are the one place this screen needs them. */
import { Icon as SymbolIcon } from '@/components/icon';
import { CoachNote } from '@/components/coach-note';
import { IntervalChart, type IntervalSegment } from '@/components/interval-chart';
import { PlanChart } from '@/components/plan-chart';
import { AltCarousel } from './carousel';
import { AltScreenBackground } from './screen-background';
import { AccentFillOpacity, Accents, BottomTabInset, Spacing } from '@/constants/theme';

export type AltPlan = {
  id: string;
  active: boolean;
  /** "Prep Plan". */
  name: string;
  /** The countdown, already worded: "303 days", "today". */
  countdown: string;
  /** What the countdown is to: "until IRONMAN 70.3 Luxembourg". */
  countdownCaption: string;
  /** The race the plan builds towards. Null when none is set. */
  raceName: string | null;
  /** "Base Phase". Null before a plan has begun. */
  phase: string | null;
  /** "Week 2 of 24". Null for a plan not under way. */
  weekLabel: string | null;
  /** 0–1 through the current week. Null when there is nothing to report. */
  progress: number | null;
  /** "4.2 of 8 hrs". Null when the week's hours are not known. */
  hoursLabel: string | null;
  /** "20 weeks". Shown on plans that have not started. */
  lengthLabel: string;
  /** The plan's photograph, behind the card. Omit for a plain themed card. */
  artwork?: string;
  /**
   * Planned hours, one per week of the plan, with the week in progress marked.
   *
   * The shape of the whole block — where the big weeks are, which one you are
   * in, how much of it is done. The card carried it in the standard build and
   * carries it here: a single progress bar says how far through *this* week the
   * athlete is and nothing about the twenty-three around it.
   */
  bars: number[];
  currentBarIndex?: number;
  currentBarProgress?: number;
  currentBarLabel?: number;
};

export type AltSession = {
  id: string;
  /**
   * Opens this session's detail sheet.
   *
   * Per session rather than one callback for the card: the sheet is addressed
   * by id, and a single shared handler cannot say which row was tapped — which
   * is how every session here briefly opened the release notes instead.
   */
  onPress: () => void;
  title: string;
  icon: SFSymbol;
  iconAccent?: string;
  completed: boolean;
  tags: string[];
  metrics: { label: string; value: string; unit?: string }[];
  /* The session's shape over time — warm-up, efforts, recoveries. Absent for
     unstructured work, which is why every field here is optional rather than
     defaulted: a steady ride has nothing to draw and should draw nothing. */
  segments?: IntervalSegment[];
  totalMinutes?: number;
  tickEvery?: number;
  coach?: string;
  /* What the coach said about this session. Nullable independently of the name
     in the domain, so a coached session with nothing written about it stays a
     representable state rather than an impossible one. */
  note?: string;
};

export type AltDay = {
  id: string;
  /** "Today", "Tomorrow", "In 3 days". */
  title: string;
  /** "Monday, June 3". */
  caption: string;
  sessions: AltSession[];
};

export type AltDashboardModel = {
  plans: AltPlan[];
  days: AltDay[];
  /** A failed read, said plainly rather than left looking like a rest week. */
  error: string | null;
  /**
   * Adds a plan. Still unwired: there is no plan-creation flow to open, and
   * this used to point at the release notes.
   */
  onAddPlan: () => void;
  /** Opens availability — which days may hold a workout, and what goes on them. */
  onUpdateSchedule: () => void;
  onOpenPlan: () => void;
};

export function AltDashboardScreen({ model }: { model: AltDashboardModel }) {
  const insets = useSafeAreaInsets();

  return (
    /* Transparent scroller over the background's layers: a `bg-background` here
       would paint straight over the photograph and the dot grid. */
    <AltScreenBackground>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 gap-5"
        contentInsetAdjustmentBehavior="automatic">
        {/* Full-bleed, so the neighbouring pages can peek in at the screen edges.
            `-mx-4` cancels the scroll content's own gutter for this block alone —
            everything below it keeps the page margin. */}
        <Box className="-mx-4">
          <AltCarousel
            accessibilityLabel="Your plans"
            addPage={<AddPlanPage onPress={model.onAddPlan} />}>
            {model.plans.map(plan => (
              <PlanPage key={plan.id} plan={plan} />
            ))}
          </AltCarousel>
        </Box>

        <ActionRow
          icon="calendar"
          accent={Accents.schedule}
          title="Update Your Schedule"
          subtitle="Your days, commitments and B/C races"
          onPress={model.onUpdateSchedule}
        />

        {model.days.map(day => (
          <DayCard key={day.id} day={day} />
        ))}

        {/* An empty week is a real state — a rest week, or a plan that has not
            generated yet — and saying so beats an unexplained gap. */}
        {model.days.length === 0 && model.error === null ? (
          <Text size="sm" className="text-muted-foreground text-center">
            Nothing scheduled this week.
          </Text>
        ) : null}

        {model.error ? (
          <Text size="sm" className="text-destructive text-center" accessibilityRole="alert">
            Your plan could not be loaded. {model.error}
          </Text>
        ) : null}

        <ActionRow
          icon="calendar.badge.plus"
          accent={Accents.commitment}
          title="Looking for more workouts?"
          subtitle="See your full plan, further into the future"
          onPress={model.onOpenPlan}
        />

        {/* The tab bar floats over the scroller. A spacer rather than a
            `contentContainerStyle` beside the className above — one mechanism
            per prop. `alt/profile-screen.tsx` says more. */}
        <View style={{ height: insets.bottom + BottomTabInset }} />
      </ScrollView>
    </AltScreenBackground>
  );
}

/**
 * One plan, as a carousel page.
 *
 * Both states are the same card so that swiping between them does not restyle
 * the world: a label row at the top, one number the size of the screen's whole
 * point in the middle, and whatever qualifies it along the bottom. What the
 * number counts is what changes — a live plan counts down to the race, one that
 * has not begun counts down to its own start.
 */
function PlanPage({ plan }: { plan: AltPlan }) {
  /*
   * With artwork behind it the card is no longer on a themed surface, so the
   * theme's text tokens stop working — `text-foreground` is black in light
   * mode, and black on a photograph is unreadable. Every string below switches
   * to fixed white when there is an image, exactly as the standard build's
   * `onImage` flag does.
   */
  const onImage = !!plan.artwork;

  return (
    /* `flex-1` so the page fills the carousel's fixed height, and
       `justify-between` so the countdown sits in the middle of it rather than
       the three blocks bunching at the top of a taller card.
       `overflow-hidden` is what clips the artwork to the corner radius. */
    <Card className="flex-1 justify-between gap-3 overflow-hidden">
      {plan.artwork ? (
        <>
          {/* Absolutely positioned so it fills the card without taking part in
              the column layout — the text below lays out as if it were not
              there — and first in source order so everything paints on top. */}
          <Image
            source={plan.artwork}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            /* Decorative: the titles already carry the meaning. */
            accessible={false}
          />
          {/* Arbitrary photography will not reliably contrast with white text,
              so this darkens it. Painted whether or not the image itself loads,
              which is what keeps the text legible when it does not.
              Heavier than the standard card's 45%: that card sets its titles
              over the foot of the image, while this one runs text the full
              height — including the caption, which lands in the brightest part
              of a daylight photo and washed out at 45%. */}
          <Box className="absolute inset-0 bg-scrim" />
        </>
      ) : null}

      <HStack className="items-center justify-between gap-3">
        <Text
          size="xs"
          className={`uppercase tracking-widest ${
            onImage ? 'text-on-scrim-muted' : 'text-muted-foreground'
          }`}>
          {plan.name}
        </Text>
        {/* On artwork the token badges become opaque boxes cut out of the
            photo, so it turns into a translucent white chip instead. */}
        <Badge
          variant={plan.active ? 'secondary' : 'outline'}
          className={onImage ? 'border-on-scrim-line bg-on-scrim-chip' : undefined}>
          <BadgeText className={onImage ? 'text-on-scrim' : undefined}>
            {plan.active ? (plan.phase ?? 'Current') : 'Upcoming'}
          </BadgeText>
        </Badge>
      </HStack>

      <VStack>
        {/* The countdown carries the emphasis on its own — no accent, no rule,
            just size. Anything else competes with it. */}
        <Heading size="4xl" className={`tracking-tight ${onImage ? 'text-on-scrim' : ''}`}>
          {plan.countdown}
        </Heading>
        <Text
          size="lg"
          className={onImage ? 'text-on-scrim-muted' : 'text-muted-foreground'}
          numberOfLines={1}>
          {plan.countdownCaption}
        </Text>
      </VStack>

      <VStack space="xs">
        <HStack className="items-baseline justify-between gap-3">
          <Text
            size="sm"
            className={`font-medium ${onImage ? 'text-on-scrim' : 'text-foreground'}`}>
            {plan.active ? (plan.weekLabel ?? 'This week') : plan.lengthLabel}
          </Text>
          <Text
            size="sm"
            className={onImage ? 'text-on-scrim-muted' : 'text-muted-foreground'}
            numberOfLines={1}>
            {plan.active ? plan.hoursLabel : plan.raceName}
          </Text>
        </HStack>

        {/* The block's shape, not just this week's. `PlanChart` draws itself in
            fixed light values for exactly this context — a card over artwork —
            so it is reused rather than rebuilt: gluestack has no opinion about
            a bar chart, and a second implementation would be a second thing to
            keep agreeing with the standard card.

            No insets. The chart sits in the card's content box, which `p-4`
            already holds 16pt clear of every edge — the same gap the standard
            card gives it with `left/right/bottom: Spacing.three`. Pulling it
            wider than the padding would push the end bars under the rounded
            corners, where `overflow-hidden` cuts them off. */}
        {plan.bars.length > 0 ? (
          <PlanChart
            bars={plan.bars}
            currentIndex={plan.currentBarIndex}
            currentProgress={plan.currentBarProgress}
            currentLabelValue={plan.currentBarLabel}
            height={60}
          />
        ) : null}
      </VStack>
    </Card>
  );
}

/** The carousel's last page: make another one. */
function AddPlanPage({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add a training plan"
      className="flex-1">
      {/* Dashed rather than solid: it is an empty slot offering to be filled,
          not a plan that exists. */}
      <Card className="flex-1 items-center justify-center gap-2 border-dashed">
        <IconChip icon="plus" accent={Accents.info} />
        <Heading size="sm">Add a plan</Heading>
        <Text size="sm" className="text-muted-foreground text-center">
          Build a new training plan around a race
        </Text>
      </Card>
    </Pressable>
  );
}

/**
 * A card that leads somewhere.
 *
 * Replaces the wide outline buttons this screen used to carry: a button that
 * spans the page reads as a primary action, and neither of these is one. A row
 * with an icon and a chevron says "this opens something" without claiming to
 * be the thing you came here to do.
 */
function ActionRow({
  icon,
  accent,
  title,
  subtitle,
  onPress,
}: {
  icon: SFSymbol;
  accent: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <Card size="sm">
        <HStack space="md" className="items-center">
          <IconChip icon={icon} accent={accent} />
          <VStack className="flex-1">
            <Text className="text-foreground font-medium">{title}</Text>
            <Text size="sm" className="text-muted-foreground">
              {subtitle}
            </Text>
          </VStack>
          <Icon as={ChevronRightIcon} size="sm" className="text-muted-foreground" />
        </HStack>
      </Card>
    </Pressable>
  );
}

function DayCard({ day }: { day: AltDay }) {
  return (
    <VStack space="sm">
      {/* Day and date on one line, the day itself emphasised: the date is there
          to confirm which day is meant, not to be read first. */}
      <HStack space="sm" className="items-baseline px-1">
        <Text size="sm" className="text-foreground font-semibold uppercase tracking-wider">
          {day.title}
        </Text>
        <Text size="xs" className="text-muted-foreground">
          {day.caption}
        </Text>
      </HStack>

      <Card size="sm" className="gap-0 px-0 py-0">
        {day.sessions.map((session, index) => (
          <View key={session.id}>
            {/* Between rows rather than after each, so the card does not end on
                a rule sitting against its own border. Inset to clear the icon
                chip, so the rule reads as separating the titles rather than
                cutting the card in half. */}
            {index > 0 ? <Divider className="ml-16" /> : null}
            <SessionRow session={session} />
          </View>
        ))}
      </Card>
    </VStack>
  );
}

function SessionRow({ session }: { session: AltSession }) {
  /* Narrowed once, so the note below and the fallback inside the row agree
     about which of the two they are showing. */
  const note = session.coach && session.note ? { coach: session.coach, body: session.note } : null;

  return (
    /* The row is a plain container, not the press target. `CoachNote` brings a
       `Pressable` of its own to expand itself, and nesting that inside a row
       that opens the session would leave which one answers a tap to responder
       negotiation — and would read to a screen reader as a button inside a
       button. Two siblings instead: a tap on the note expands the note, a tap
       anywhere else opens the session. */
    <View className="px-3 py-3">
      <Pressable
        onPress={session.onPress}
        accessibilityRole="button"
        accessibilityLabel={session.title}
        accessibilityHint="Opens the session">
        <HStack space="md" className="items-start">
          <IconChip icon={session.icon} accent={session.iconAccent ?? Accents.interval} />

          <VStack space="xs" className="flex-1">
            <HStack space="sm" className="items-start">
              <Text className="flex-1 text-foreground font-medium">{session.title}</Text>
              {session.completed ? (
                <Badge variant="secondary">
                  <BadgeText>Done</BadgeText>
                </Badge>
              ) : null}
            </HStack>

            {session.tags.length > 0 ? (
              <HStack space="xs" className="flex-wrap">
                {session.tags.map(tag => (
                  <Badge key={tag} variant="outline">
                    <BadgeText>{tag}</BadgeText>
                  </Badge>
                ))}
              </HStack>
            ) : null}

            {/* Value over label, and the value first: these are the numbers the
                athlete is scanning for, and a leading grey label buries them. */}
            {session.metrics.length > 0 ? (
              <HStack space="lg" className="flex-wrap pt-1">
                {session.metrics.map(metric => (
                  <VStack key={metric.label}>
                    <Text size="sm" className="text-foreground font-semibold">
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
            ) : null}

            {/* The session's shape, after the numbers that summarise it and
                before the coach's name — the same order the standard card uses.
                `IntervalChart` is reused rather than rebuilt: it is themed text
                and plain views, and these rows sit on a card rather than over
                artwork, so nothing about it needs restating in gluestack. */}
            {session.segments && session.segments.length > 0 ? (
              <IntervalChart
                segments={session.segments}
                totalMinutes={session.totalMinutes ?? 0}
                tickEvery={session.tickEvery}
                height={48}
                /* Shorter than the standard card's 64: this chart shares its
                   column with the icon chip rather than running the card's full
                   width, and at 64 it out-weighed the title above it. */
                style={{ paddingTop: Spacing.one }}
              />
            ) : null}

            {/* A coach with nothing written about this session: there is
                nothing to expand, so the name is said plainly rather than
                dressing an empty block up as a note. */}
            {note === null && session.coach ? (
              <Text size="xs" className="text-muted-foreground">
                With {session.coach}
              </Text>
            ) : null}
          </VStack>
        </HStack>
      </Pressable>

      {/* `CoachNote` reused rather than rebuilt, for the same reason as the
          chart above: it is themed text over plain views, and a gluestack copy
          would be a second thing to keep agreeing with the standard card.

          `pl-14` is the chip's width plus the row's gap (44 + 12), which lands
          the note on the same left edge as the title and the chart above it. */}
      {note ? (
        <View className="pl-14 pt-2">
          <CoachNote coach={note.coach} note={note.body} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * A symbol in a tinted round chip.
 *
 * The tint is the discipline's own accent at the same low opacity the standard
 * build's chips use (`AccentFillOpacity`), so the two builds agree on how loud
 * an accent fill is allowed to be. Inline rather than a class because the
 * colour is data — one per discipline — and cannot be a Tailwind token.
 */
function IconChip({ icon, accent }: { icon: SFSymbol; accent: string }) {
  return (
    <Box
      className="size-11 items-center justify-center rounded-full"
      style={{ backgroundColor: `${accent}${AccentFillOpacity}` }}>
      <SymbolIcon name={icon} size={20} tintColor={accent} />
    </Box>
  );
}
