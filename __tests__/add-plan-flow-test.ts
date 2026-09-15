/**
 * Adding a plan walks a much shorter version of the personalisation flow.
 *
 * An athlete who already has a profile is asked only what makes *this* plan
 * different from the last one. Everything else — ability, thresholds, days,
 * hours, commitments — is already stored and editable in Settings, so asking
 * again would be asking them to retype what the app knows, and a second answer
 * would quietly disagree with the one Settings still shows.
 *
 * The orders are the single source of that: the progress bar, the funnel and
 * the forks between screens all read them, so a step added to an array is a
 * step added to all three.
 */
import {
  AddPlanNoRaceFlow,
  AddPlanRaceFlow,
  NoRaceFlow,
  RaceFlow,
  nextStep,
  orderFor,
  stepProgress,
} from '@/app/(setup)/flow-order';

describe('which order is in force', () => {
  it('asks a new athlete everything and a returning one only the goal', () => {
    expect(orderFor('onboarding', true)).toBe(RaceFlow);
    expect(orderFor('add-plan', true)).toBe(AddPlanRaceFlow);
    expect(orderFor('onboarding', false)).toBe(NoRaceFlow);
    expect(orderFor('add-plan', false)).toBe(AddPlanNoRaceFlow);
  });

  it('treats an unanswered race question as the longer path', () => {
    // `race-or-not` is the screen that decides it, so the bar has to move
    // sensibly before the branch is known.
    expect(orderFor('add-plan', null)).toBe(AddPlanRaceFlow);
    expect(orderFor('onboarding', null)).toBe(RaceFlow);
  });

  it('never asks a returning athlete for anything Settings already owns', () => {
    const settingsOwns = [
      'personal-details',
      'body-metrics',
      'ability-swim',
      'ability-run',
      'ability-cycle',
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
    ];

    for (const step of settingsOwns) {
      expect(AddPlanRaceFlow).not.toContain(step);
      expect(AddPlanNoRaceFlow).not.toContain(step);
      // And each one is genuinely in the first-run flow, so this test fails if
      // a step is renamed rather than silently passing on a typo.
      expect(RaceFlow).toContain(step);
    }
  });
});

describe('where a fork leads', () => {
  it('sends a returning athlete from the last race screen to the overview', () => {
    // The fork this exists for: in onboarding these run on into the ability
    // stretch, which a returning athlete must not be asked for.
    expect(nextStep('other-races', 'onboarding', true)).toBe('/ability-swim');
    expect(nextStep('other-races', 'add-plan', true)).toBe('/plan-overview');

    expect(nextStep('choose-goal', 'onboarding', false)).toBe('/ability-swim');
    expect(nextStep('choose-goal', 'add-plan', false)).toBe('/plan-overview');
  });

  it('has nothing after the overview, in either flow', () => {
    expect(nextStep('plan-overview', 'add-plan', true)).toBeNull();
    expect(nextStep('plan-overview', 'onboarding', true)).toBeNull();
  });

  it('returns null for a step that is not in the flow at all', () => {
    expect(nextStep('body-metrics', 'add-plan', true)).toBeNull();
  });
});

describe('the progress bar', () => {
  it('divides by the flow actually being walked', () => {
    // The whole point: six steps reported against twenty-four would leave the
    // athlete finishing the flow with the bar a quarter full.
    expect(stepProgress('plan-overview', true, 'add-plan')).toBe(1);
    expect(stepProgress('plan-overview', true, 'onboarding')).toBe(1);

    expect(stepProgress('race-or-not', null, 'add-plan')).toBeCloseTo(1 / 6);
    expect(stepProgress('race-or-not', null, 'onboarding')).toBeCloseTo(1 / 24);
  });

  it('defaults to onboarding, for the screens the short flow never reaches', () => {
    expect(stepProgress('body-metrics', true)).toBe(
      stepProgress('body-metrics', true, 'onboarding'),
    );
  });
});
