/**
 * `ConsentService` over the Stamina API — `PUT /v1/profile/consent`.
 *
 * No `uid` in the path: the account comes from the access token, the same way
 * the rest of `/v1/profile` works.
 */
import type { ConsentService } from './consent-service';

import { api } from '@/services/api/client';

export const apiConsentService: ConsentService = {
  async recordAnalytics(_uid, granted) {
    await api.put('/v1/profile/consent', { analytics: granted ? 'granted' : 'denied' });
  },
};
