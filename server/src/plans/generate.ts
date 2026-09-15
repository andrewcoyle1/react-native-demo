/**
 * Making a plan.
 *
 * Extracted from `onboarding/service.ts` when a second caller appeared: an
 * athlete who already has a profile can add a plan from the Dashboard, and
 * that goes through exactly the same steps as the first one — insert the race,
 * insert the plan, fill its opening week. Two copies of that would be two
 * copies to keep agreeing.
 *
 * Neither "onboarding" nor "training reads" owns this, which is why it sits in
 * its own module rather than being exported out of either.
 */
import type pg from 'pg';

import type { PlanDTO, RaceDraftDTO } from '../domain.ts';
import type { Discipline } from '../domain.ts';
import * as onboardingQ from '../onboarding/queries.ts';

export const PLAN_WEEKS = 12;

const ROTATION: Discipline[] = ['run', 'ride', 'swim'];

/** Matches the artwork `plan-overview.tsx` previews during onboarding. */
const PLAN_ARTWORK = 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800';

/** The Monday on or after `from`, as a 'YYYY-MM-DD' string. */
export function nextMonday(from: Date): string {
  const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  // Today counts as "next Monday" only when it already is one.
  if (date.getUTCDay() !== 1) {
    date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  }
  return toDayKey(date);
}

export function addDays(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, date! + delta));
  return toDayKey(next);
}

export function toDayKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    `${date.getUTCMonth() + 1}`.padStart(2, '0'),
    `${date.getUTCDate()}`.padStart(2, '0'),
  ].join('-');
}

/**
 * One session per day the athlete has time, rotating through run/ride/swim —
 * a starting point, not a training programme. A day already claimed by a
 * commitment (a standing gym session, say) is left alone rather than doubled
 * up on.
 */
export async function generateFirstWeek(
  userId: string,
  planId: string,
  monday: string,
  availableMinutes: number[],
  db: pg.PoolClient,
): Promise<void> {
  // Index 0 = Sunday, matching `availableMinutes`; the Sunday before `monday`
  // is that week's day 0.
  const sunday = addDays(monday, -1);
  let rotationIndex = 0;

  for (let weekday = 0; weekday < 7; weekday += 1) {
    const minutes = availableMinutes[weekday] ?? 0;
    if (minutes <= 0) {
      continue;
    }

    const discipline = ROTATION[rotationIndex % ROTATION.length]!;
    rotationIndex += 1;

    await onboardingQ.insertSession(
      userId,
      planId,
      {
        date: addDays(sunday, weekday),
        position: 0,
        title: `Getting started: ${discipline}`,
        discipline,
        purpose: 'endurance',
        durationSeconds: minutes * 60,
      },
      db,
    );
  }
}

/**
 * Inserts a plan, its race if it has one, and its opening week.
 *
 * `weeklyHours` is the same figure for every week: the plan generator does not
 * periodise yet, and pretending it does by varying the array would be drawing
 * a build the sessions do not follow.
 */
export async function createPlan(
  userId: string,
  options: {
    race: RaceDraftDTO | null;
    startDate: string;
    status: PlanDTO['status'];
    availableMinutes: number[];
    weeklyHours: number;
  },
  db: pg.PoolClient,
): Promise<string> {
  const raceId = options.race
    ? await onboardingQ.insertRace(
        userId,
        {
          name: options.race.name,
          place: options.race.place,
          date: options.race.date,
          priority: options.race.priority,
          targetSeconds: options.race.targetSeconds,
          legs: options.race.legs.map(leg => ({
            discipline: leg.discipline,
            distanceMetres: leg.distanceMetres,
          })),
        },
        db,
      )
    : null;

  const planId = await onboardingQ.insertPlan(
    userId,
    {
      raceId,
      /* 'Prep Plan', not the race name: `plan-presenter.ts` builds
         "Current - {name}" and "{name} week N of M" from this, and the
         design's own card reads "Current - Prep Plan" — the race itself is
         what `title3` ("until {race.name}") already names. */
      name: 'Prep Plan',
      phase: 'Base Phase',
      startDate: options.startDate,
      endDate: addDays(options.startDate, PLAN_WEEKS * 7 - 1),
      weeks: PLAN_WEEKS,
      weeklyPlannedHours: Array<number>(PLAN_WEEKS).fill(options.weeklyHours),
      artworkUrl: PLAN_ARTWORK,
      status: options.status,
    },
    db,
  );

  await generateFirstWeek(userId, planId, options.startDate, options.availableMinutes, db);

  return planId;
}
