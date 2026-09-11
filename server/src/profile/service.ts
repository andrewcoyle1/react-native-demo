/**
 * The athlete's profile.
 *
 * The one rule worth stating: a missing profile is a state, not a failure. A
 * signed-in athlete who has not been through setup has no row, the endpoint
 * answers 404, and the app renders that as `UserState.absent` rather than an
 * error. Nothing here ever creates a profile on someone's behalf.
 */
import type { UserDTO } from '../domain.ts';
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
