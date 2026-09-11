/**
 * `UserService` over the Stamina API.
 *
 * `subscribe` fetches once and calls back once. The signature is stream-shaped
 * on purpose — `onData` may fire many times — so when the change stream lands
 * (see `docs/streaming.md`) only this file changes, and the provider, the
 * presenters and every screen stay exactly as they are.
 *
 * The teardown aborts the request rather than merely ignoring it: a screen that
 * unmounts mid-flight should not hold a socket open, and a stale response must
 * never land on top of a newer one.
 */
import type { UserDraft, UserModel, UserService } from './user-service';

import type { UserDTO } from '@/domain/wire.ts';
import { ApiError, api } from '@/services/api/client';

/**
 * `dateOfBirth` arrives as 'YYYY-MM-DD' and becomes a local `Date`.
 *
 * Parsed by parts rather than by `new Date(string)`, which reads a bare date as
 * UTC midnight and therefore shows the day before for anyone west of Greenwich.
 */
function toDate(day: string): Date {
  const parts = day.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function toUserModel(dto: UserDTO): UserModel {
  return {
    id: dto.id,
    name: dto.name,
    dateOfBirth: toDate(dto.dateOfBirth),
    sex: dto.sex,
    units: dto.units,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : null,
    modifiedAt: dto.modifiedAt ? new Date(dto.modifiedAt) : null,
  };
}

/** What a draft looks like on the wire. The zone comes from the device. */
function toBody(draft: Partial<UserDraft>) {
  return {
    ...(draft.name !== undefined ? { name: draft.name } : {}),
    ...(draft.dateOfBirth !== undefined
      ? {
          // Local parts, not toISOString, for the same reason as above.
          dateOfBirth: [
            draft.dateOfBirth.getFullYear(),
            `${draft.dateOfBirth.getMonth() + 1}`.padStart(2, '0'),
            `${draft.dateOfBirth.getDate()}`.padStart(2, '0'),
          ].join('-'),
        }
      : {}),
    ...(draft.sex !== undefined ? { sex: draft.sex } : {}),
    ...(draft.units !== undefined ? { units: draft.units } : {}),
  };
}

/*
 * Every `uid` parameter here is unused, and deliberately so: the account is
 * decided by the access token, so no path carries a user id and a request
 * cannot be aimed at anyone else's profile.
 */
export const apiUserService: UserService = {
  subscribe(_uid, onUser, onError) {
    const controller = new AbortController();

    api
      .get<UserDTO>('/v1/profile', { signal: controller.signal })
      .then(dto => onUser(toUserModel(dto)))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        // A profile that does not exist is `absent`, which is a state the app
        // models deliberately — not a failure to report.
        if (error instanceof ApiError && error.status === 404) {
          onUser(null);
          return;
        }

        onError(error instanceof Error ? error : new Error('Could not load your profile.'));
      });

    return () => controller.abort();
  },

  async create(_uid, draft) {
    await api.post<UserDTO>('/v1/profile', {
      ...toBody(draft),
      // The server needs the athlete's zone to decide what day it is for them.
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  },

  async update(_uid, changes) {
    const body = toBody(changes);

    if (Object.keys(body).length === 0) {
      // The API rejects an empty patch rather than reporting a no-op as
      // success; there is no reason to make the round trip to find that out.
      return;
    }

    await api.patch<UserDTO>('/v1/profile', body);
  },
};
