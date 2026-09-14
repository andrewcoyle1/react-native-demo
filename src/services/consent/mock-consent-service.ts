/** Logs instead of recording, matching the other mock services. */
import type { ConsentService } from './consent-service';

export const mockConsentService: ConsentService = {
  async recordAnalytics(uid, granted) {
    console.log(`[consent:mock] ${uid} → ${granted ? 'granted' : 'denied'}`);
  },
};
