import { router, type Href } from 'expo-router';

/**
 * The two orders the flow can take, and where a given screen sits in each —
 * which is all `OnboardingStep`'s progress bar needs.
 *
 * A race and no race diverge after the first screen: a race picks a plan
 * distance and finds its event before the shared ability/metrics/schedule
 * stretch; no race skips straight to a training goal instead. Both rejoin at
 * `ability-swim` and share everything after it.
 */
export const RaceFlow = [
  'race-or-not',
  'plan-select',
  'find-race',
  'race-goal',
  'other-races',
  'ability-swim',
  'ability-run',
  'ability-cycle',
  'personal-details',
  'body-metrics',
  'fitness-heart-ftp',
  'fitness-pace',
  'training-hours',
  'available-days',
  'swim-days',
  'cycle-days',
  'run-days',
  'long-days',
  'limited-days',
  'weekly-commitments',
  'distance-preferences',
  'connect-apps',
  'notifications',
  'plan-overview',
] as const;

export const NoRaceFlow = [
  'race-or-not',
  'choose-goal',
  'ability-swim',
  'ability-run',
  'ability-cycle',
  'personal-details',
  'body-metrics',
  'fitness-heart-ftp',
  'fitness-pace',
  'training-hours',
  'available-days',
  'swim-days',
  'cycle-days',
  'run-days',
  'long-days',
  'limited-days',
  'weekly-commitments',
  'distance-preferences',
  'connect-apps',
  'notifications',
  'plan-overview',
] as const;

/**
 * The same flow, for an athlete who already has a profile.
 *
 * Only what makes *this* plan different from the last one. Ability, body
 * metrics, thresholds, days, hours and commitments are already stored against
 * the athlete and editable in Settings, so asking again would be asking them
 * to retype what the app knows — and a second answer would quietly disagree
 * with the one Settings still shows.
 */
export const AddPlanRaceFlow = [
  'race-or-not',
  'plan-select',
  'find-race',
  'race-goal',
  'other-races',
  'plan-overview',
] as const;

export const AddPlanNoRaceFlow = ['race-or-not', 'choose-goal', 'plan-overview'] as const;

/** Which flow the athlete is in: their first plan, or another one. */
export type SetupMode = 'onboarding' | 'add-plan';

export type FlowStep = (typeof RaceFlow)[number] | (typeof NoRaceFlow)[number];

/**
 * The order in force, which is what both the progress bar and the funnel
 * divide by. `hasRace` is null before the first screen answers it — treated as
 * the longer path so the bar still moves sensibly before the branch.
 */
export function orderFor(mode: SetupMode, hasRace: boolean | null): readonly string[] {
  if (mode === 'add-plan') {
    return hasRace === false ? AddPlanNoRaceFlow : AddPlanRaceFlow;
  }
  return hasRace === false ? NoRaceFlow : RaceFlow;
}

/**
 * The route after `step`, or null at the end of the flow.
 *
 * Returns an `Href` so a screen can hand it straight to the router. The cast
 * lives here, once, rather than at every call site: expo-router's generated
 * union cannot see that these strings are route names, but the arrays above
 * are exactly the flow's screens and a step that is not one of them is a
 * mistake this file should catch rather than pass on.
 */
export function nextStep(step: string, mode: SetupMode, hasRace: boolean | null): Href | null {
  const order = orderFor(mode, hasRace);
  const index = order.indexOf(step);

  if (index === -1 || index === order.length - 1) {
    return null;
  }
  return `/${order[index + 1]!}` as Href;
}

/**
 * How far along the bar sits.
 *
 * `mode` defaults because only the seven screens the add-plan flow visits ever
 * pass one — the other eighteen are unreachable from it, so requiring the
 * argument everywhere would be ceremony for screens that cannot be in that
 * flow.
 */
export function stepProgress(
  step: FlowStep,
  hasRace: boolean | null,
  mode: SetupMode = 'onboarding',
): number {
  const order = orderFor(mode, hasRace);
  const index = order.indexOf(step);
  if (index === -1) return 0;
  return (index + 1) / order.length;
}

/**
 * Advances to the next screen in the flow in force.
 *
 * A screen that sits at a fork — `other-races` ends the race path, and its
 * next screen differs between a first plan and a later one — asks the order
 * rather than naming a route, so adding or removing a step is a change to the
 * arrays above and nowhere else.
 */
export function pushNext(step: string, mode: SetupMode, hasRace: boolean | null): void {
  const next = nextStep(step, mode, hasRace);
  if (next) {
    router.push(next);
  }
}
