/**
 * `OnboardingService` over the Stamina API — `POST /v1/onboarding/complete`.
 *
 * Dates go over the wire as local 'YYYY-MM-DD' parts, not `toISOString`, for
 * the same reason `api-user-service.ts` does it: a bare UTC date reads as the
 * day before for anyone west of Greenwich.
 */
import type { OnboardingService } from './onboarding-service';

import { api } from '@/services/api/client';

function dayKey(date: Date): string {
  return [date.getFullYear(), `${date.getMonth() + 1}`.padStart(2, '0'), `${date.getDate()}`.padStart(2, '0')].join(
    '-',
  );
}

export const apiOnboardingService: OnboardingService = {
  async complete(_uid, draft) {
    await api.post('/v1/onboarding/complete', {
      profile: {
        name: draft.profile.name,
        dateOfBirth: dayKey(draft.profile.dateOfBirth),
        sex: draft.profile.sex,
        // The server needs the athlete's zone to decide what day it is for them.
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      units: draft.units,
      metrics: draft.metrics,
      schedule: draft.schedule,
      race: draft.race
        ? {
            name: draft.race.name,
            place: draft.race.place,
            date: dayKey(draft.race.date),
            priority: draft.race.priority,
            targetSeconds: draft.race.targetSeconds,
            legs: draft.race.legs,
          }
        : null,
      weeklyHours: draft.weeklyHours,
    });
  },
};
