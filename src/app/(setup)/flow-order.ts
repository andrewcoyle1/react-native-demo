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

export type FlowStep = (typeof RaceFlow)[number] | (typeof NoRaceFlow)[number];

/** `hasRace` is `null` before the first screen answers it — treated as the
    (longer) race path so the bar still moves sensibly before the branch. */
export function stepProgress(step: FlowStep, hasRace: boolean | null): number {
  const order = hasRace === false ? NoRaceFlow : RaceFlow;
  const index = order.indexOf(step as never);
  if (index === -1) return 0;
  return (index + 1) / order.length;
}
