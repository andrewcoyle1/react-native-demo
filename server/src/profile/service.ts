/**
 * The athlete's profile.
 *
 * The one rule worth stating: a missing profile is a state, not a failure. A
 * signed-in athlete who has not been through setup has no row, the endpoint
 * answers 404, and the app renders that as `UserState.absent` rather than an
 * error. Nothing here ever creates a profile on someone's behalf.
 */
import type { AthleteMetricsDTO, UserDTO } from '../domain.ts';
import { pool, transaction } from '../db.ts';
import { conflict, notFound } from '../errors.ts';
import * as q from './queries.ts';

export type ProfileDraft = {
  name: string;
  dateOfBirth: string;
  sex: UserDTO['sex'];
  timezone: string;
  units: UserDTO['units'];
};

export async function readProfile(userId: string): Promise<UserDTO> {
  const row = await q.findProfile(userId, pool);

  if (!row) {
    throw notFound('profile_not_found', 'This account has no profile yet.');
  }

  return q.toUserDTO(row);
}

export async function createProfile(userId: string, draft: ProfileDraft): Promise<UserDTO> {
  return transaction(async db => {
    if (await q.findProfile(userId, db)) {
      throw conflict('profile_exists', 'This account already has a profile.');
    }

    await q.insertProfile(userId, draft, db);
    await q.updateTimezone(userId, draft.timezone, db);

    // Read back rather than echoing the draft: the timestamps and any column
    // default are the database's to decide, not this function's.
    const row = await q.findProfile(userId, db);
    return q.toUserDTO(row!);
  });
}

export async function updateProfile(
  userId: string,
  changes: Partial<ProfileDraft>,
): Promise<UserDTO> {
  return transaction(async db => {
    if (!(await q.findProfile(userId, db))) {
      throw notFound('profile_not_found', 'This account has no profile yet.');
    }

    await q.updateProfile(userId, changes, db);

    if (changes.timezone !== undefined) {
      await q.updateTimezone(userId, changes.timezone, db);
    }

    const row = await q.findProfile(userId, db);
    return q.toUserDTO(row!);
  });
}

/**
 * The athlete's threshold figures.
 *
 * An athlete with no metrics row is not an error: onboarding writes one, but a
 * profile created before those questions existed has none, and the screen shows
 * "Not set" for each figure. So this answers a DTO of nulls rather than a 404 —
 * unlike `readProfile`, where absence genuinely means "you have not set up yet".
 */
export async function readMetrics(userId: string): Promise<AthleteMetricsDTO> {
  const row = await q.findMetrics(userId, pool);

  if (!row) {
    return {
      heightCm: null,
      weightKg: null,
      heartRateMin: null,
      heartRateMax: null,
      cyclingFtp: null,
      runPaceSecondsPerKm: null,
      swimPaceSecondsPer100m: null,
      modifiedAt: null,
    };
  }

  return q.toMetricsDTO(row);
}

/** A patch over the figures. `null` clears one; an absent key leaves it alone. */
export type MetricsChanges = Partial<Record<keyof AthleteMetricsDTO, number | null>>;

export async function updateMetrics(
  userId: string,
  changes: MetricsChanges,
): Promise<AthleteMetricsDTO> {
  return transaction(async db => {
    // The profile is the account's existence check. Without it a metrics row
    // could be written for an athlete who never completed setup, which would
    // then be invisible to every screen that reads the profile first.
    if (!(await q.findProfile(userId, db))) {
      throw notFound('profile_not_found', 'This account has no profile yet.');
    }

    return q.toMetricsDTO(await q.patchMetrics(userId, changes, db));
  });
}

/**
 * Stores the athlete's analytics consent decision.
 *
 * Deliberately not gated on a profile existing: consent is asked before setup,
 * so requiring one would make it impossible to answer at the moment it is put.
 * Re-answering overwrites, which is what revoking and re-granting are.
 */
export async function recordAnalyticsConsent(
  userId: string,
  consent: 'granted' | 'denied',
): Promise<{ analyticsConsent: string; analyticsConsentAt: string }> {
  return q.updateAnalyticsConsent(userId, consent, pool);
}
