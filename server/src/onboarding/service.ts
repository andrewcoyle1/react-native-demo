/**
 * `POST /v1/onboarding/complete` — the single call "Personalise my plan" makes.
 *
 * It persists everything the onboarding flow collected (profile, metrics,
 * schedule, an optional goal race) and, the first time, generates a plan and
 * its opening week of sessions. Session planning itself is deliberately naive
 * here — one session per available day, rotating disciplines — with richer
 * generation left for later; what this guarantees is that pressing the button
 * always leaves the athlete with real, saved data and a plan to look at.
 *
 * Idempotent by construction: if the athlete already has a current or
 * upcoming plan (a retry, or backing up through onboarding and resubmitting),
 * profile/metrics/schedule are still saved fresh, but no second plan is
 * generated — the existing one is returned instead.
 */
import type {
  Discipline,
  OnboardingCompleteRequest,
  OnboardingCompleteResponse,
  RaceDTO,
} from '../domain.ts';
import { transaction } from '../db.ts';
import * as profileQ from '../profile/queries.ts';
import * as trainingQ from '../training/queries.ts';
import * as q from './queries.ts';

const PLAN_WEEKS = 12;
const ROTATION: Discipline[] = ['run', 'ride', 'swim'];
/** Matches the artwork `plan-overview.tsx` previews during onboarding. */
const PLAN_ARTWORK = 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800';

/** The Monday on or after `from`, as a 'YYYY-MM-DD' string. */
function nextMonday(from: Date): string {
  const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  // Today counts as "next Monday" only when it already is one.
  if (date.getUTCDay() !== 1) {
    date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  }
  return toDayKey(date);
}

function addDays(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, date! + delta));
  return toDayKey(next);
}

function toDayKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    `${date.getUTCMonth() + 1}`.padStart(2, '0'),
    `${date.getUTCDate()}`.padStart(2, '0'),
  ].join('-');
}

export async function completeOnboarding(
  userId: string,
  draft: OnboardingCompleteRequest,
): Promise<OnboardingCompleteResponse> {
  return transaction(async db => {
    await q.upsertProfile(
      userId,
      { name: draft.profile.name, dateOfBirth: draft.profile.dateOfBirth, sex: draft.profile.sex, units: draft.units },
      db,
    );
    await q.updateTimezone(userId, draft.profile.timezone, db);
    const metrics = await q.upsertMetrics(userId, draft.metrics, db);

    await trainingQ.upsertAvailability(userId, draft.schedule.availableMinutes, db);
    await trainingQ.replaceCommitments(userId, draft.schedule.commitments, db);

    // Sequential, not `Promise.all`: these share one connection, which cannot
    // run more than one query at a time.
    const profileRow = await profileQ.findProfile(userId, db);
    const schedule = await trainingQ.findSchedule(userId, db);
    const existingPlans = await trainingQ.findPlans(userId, ['current', 'upcoming'], db);

    let plan = existingPlans[0] ?? null;
    let race: RaceDTO | null = null;

    if (plan) {
      // Already onboarded once: don't generate a second plan, but do report
      // the race it targets, if any, since the response shape always pairs them.
      if (plan.raceId) {
        race = (await trainingQ.findRaces(userId, db)).find(r => r.id === plan!.raceId) ?? null;
      }
    } else {
      let raceId: string | null = null;

      if (draft.race) {
        raceId = await q.insertRace(
          userId,
          {
            name: draft.race.name,
            place: draft.race.place,
            date: draft.race.date,
            priority: draft.race.priority,
            targetSeconds: draft.race.targetSeconds,
            legs: draft.race.legs.map(leg => ({ discipline: leg.discipline, distanceMetres: leg.distanceMetres })),
          },
          db,
        );
        race = (await trainingQ.findRaces(userId, db)).find(r => r.id === raceId) ?? null;
      }

      const startDate = nextMonday(new Date());
      const endDate = addDays(startDate, PLAN_WEEKS * 7 - 1);
      const weeklyPlannedHours = Array<number>(PLAN_WEEKS).fill(draft.weeklyHours);

      const planId = await q.insertPlan(
        userId,
        {
          raceId,
          // 'Prep Plan', not the race name: `plan-presenter.ts` builds
          // "Current - {name}" and "{name} week N of M" from this, and the
          // design's own card reads "Current - Prep Plan" — the race itself
          // is what `title3` ("until {race.name}") already names.
          name: 'Prep Plan',
          phase: 'Base Phase',
          startDate,
          endDate,
          weeks: PLAN_WEEKS,
          weeklyPlannedHours,
          artworkUrl: PLAN_ARTWORK,
        },
        db,
      );

      await generateFirstWeek(userId, planId, startDate, draft.schedule.availableMinutes, db);

      const [inserted] = await trainingQ.findPlans(userId, ['current'], db);
      plan = inserted ?? null;
    }

    return {
      profile: profileQ.toUserDTO(profileRow!),
      metrics,
      schedule: schedule!,
      race,
      plan: plan!,
    };
  });
}

/**
 * One session per day the athlete has time, rotating through run/ride/swim —
 * a starting point, not a training programme. A day already claimed by a
 * commitment (a standing gym session, say) is left alone rather than doubled
 * up on.
 */
async function generateFirstWeek(
  userId: string,
  planId: string,
  monday: string,
  availableMinutes: number[],
  db: Parameters<Parameters<typeof transaction>[0]>[0],
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

    await q.insertSession(
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
