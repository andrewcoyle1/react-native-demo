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
import { PLAN_WEEKS, addDays, createPlan, nextMonday } from '../plans/generate.ts';

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
      await createPlan(
        userId,
        {
          race: draft.race ?? null,
          startDate: nextMonday(new Date()),
          status: 'current',
          availableMinutes: draft.schedule.availableMinutes,
          weeklyHours: draft.weeklyHours,
        },
        db,
      );

      const [inserted] = await trainingQ.findPlans(userId, ['current'], db);
      plan = inserted ?? null;
      if (plan?.raceId) {
        race = (await trainingQ.findRaces(userId, db)).find(r => r.id === plan!.raceId) ?? null;
      }
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

