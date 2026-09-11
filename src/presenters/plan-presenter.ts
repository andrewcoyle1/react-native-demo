/**
 * Turns a `PlanModel` and its race into `PlanCard`'s props.
 *
 * The strings this builds were previously typed into the dashboard — "305 days",
 * "starts in 166 days", "Prep plan week 1 of 24 - Base Phase". They are computed
 * from dates here, so they are still right tomorrow.
 */
import type { RaceTarget } from '@/components/profile-card';
import { Disciplines } from '@/constants/disciplines';
import { formatDayCount, formatDistance, formatDuration, trimDecimal } from '@/domain/format';
import { daysBetween, toDateKey, type UnitSystem } from '@/domain/training';
import type { PlanModel, RaceModel } from '@/providers/training-provider';

/**
 * Everything `PlanCard` needs, bar the handlers and style the screen supplies.
 *
 * `actualHoursThisWeek` is optional and, when given, overrides both the
 * current bar's label and its fill: the bar itself still plots the planned
 * figure (that dashed outline is the week's target), but what the athlete
 * actually trained is what the label and the fill should read — not the plan.
 * Omit it and both fall back to the plan's own stored `currentWeekProgress`,
 * which is what a caller not tracking activities yet still gets.
 */
export function toPlanCardProps(
  plan: PlanModel,
  race: RaceModel | null,
  today = toDateKey(new Date()),
  actualHoursThisWeek?: number,
) {
  const active = plan.status === 'current';

  const plannedThisWeek = plan.currentWeekIndex !== null ? plan.weeklyPlannedHours[plan.currentWeekIndex] : undefined;

  const chart = {
    bars: plan.weeklyPlannedHours,
    currentBarIndex: plan.currentWeekIndex ?? undefined,
    currentBarProgress:
      actualHoursThisWeek !== undefined && plannedThisWeek
        ? Math.min(actualHoursThisWeek / plannedThisWeek, 1)
        : (plan.currentWeekProgress ?? undefined),
    currentBarLabel: actualHoursThisWeek !== undefined ? Math.round(actualHoursThisWeek * 10) / 10 : undefined,
    backgroundImage: plan.artworkUrl ?? undefined,
  };

  if (active) {
    // An active plan leads with the countdown to the race.
    const countdown = race ? formatDayCount(daysBetween(today, race.date)) : null;

    // `currentWeekIndex` is the chart's own 0-based index, so the week the
    // athlete is in is one more than it.
    const week = plan.currentWeekIndex !== null ? plan.currentWeekIndex + 1 : null;
    const progress = week !== null ? `${plan.name} week ${week} of ${plan.weeks}` : plan.name;

    return {
      ...chart,
      active: true,
      title1: `Current - ${plan.name}`,
      title2: countdown ?? undefined,
      title3: race ? `until ${race.name}` : undefined,
      title4: plan.phase ? `${progress} - ${plan.phase}` : progress,
    };
  }

  // An upcoming plan leads with the race it is building towards, and closes with
  // when it starts — which is the run of words the card picks out in the accent.
  const startsIn = formatDayCount(daysBetween(today, plan.startDate));

  return {
    ...chart,
    active: false,
    title1: `Upcoming - ${plan.name}`,
    title2: `${plan.weeks} week ${plan.name} for`,
    title3: race?.name,
    title4: `starts in ${startsIn}`,
    highlight: startsIn,
  };
}

/** The race's legs, as the profile card's three distance targets. */
export function toRaceTargets(race: RaceModel, units: UnitSystem): RaceTarget[] {
  const alternate: UnitSystem = units === 'metric' ? 'imperial' : 'metric';

  return race.legs.map(leg => {
    // No discipline passed: these are race legs, so even the swim reads in
    // kilometres rather than in the metres a pool set would use.
    const primary = trimDecimal(formatDistance(leg.distanceMetres, units));
    const secondary = trimDecimal(formatDistance(leg.distanceMetres, alternate));

    return {
      icon: Disciplines[leg.discipline].icon,
      accent: Disciplines[leg.discipline].accent,
      value: primary.value,
      unit: primary.unit,
      alternate: `${secondary.value} ${secondary.unit}`,
    };
  });
}

/** `'11 July 2027'` — the race date as the profile card shows it. */
export function formatRaceDate(race: RaceModel): string {
  const [year, month, day] = race.date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** `'5H 08M'` — the goal time, in the design's own casing. */
export function formatRaceTarget(race: RaceModel): string | null {
  if (race.targetSeconds === null) {
    return null;
  }

  const [hours, minutes] = formatDuration(race.targetSeconds).split(':');
  return `${Number(hours)}H ${minutes}M`;
}
