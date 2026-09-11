/**
 * `SettingsService` over the Stamina API.
 *
 * Only the metrics half is a real round trip — `/v1/profile/metrics`, GET to
 * read and PATCH to change. Everything else falls through to
 * `localSettingsStore`, because no endpoint exists to call yet; see
 * `settings-service.ts` for which is which and why.
 *
 * Like every path under `/v1/profile`, neither URL carries a user id: the
 * account comes from the access token, so a request structurally cannot reach
 * another athlete's figures. The `uid` parameters below are therefore unused
 * for metrics, and kept only because the local store is keyed by them.
 */
import { localSettingsStore } from './local-settings-store';
import type {
  AthleteMetrics,
  IntegrationChanges,
  Integrations,
  MetricsChanges,
  Preferences,
  SettingsService,
  Subscription,
} from './settings-service';

import type { AthleteMetricsDTO } from '@/domain/wire.ts';
import { api } from '@/services/api/client';

/**
 * The DTO carries height and weight too, which the profile screen does not
 * edit. They are dropped here rather than carried as dead fields — a PATCH
 * never sends them, so they are never at risk of being overwritten.
 */
function toMetrics(dto: AthleteMetricsDTO): AthleteMetrics {
  return {
    heartRateMin: dto.heartRateMin,
    heartRateMax: dto.heartRateMax,
    cyclingFtp: dto.cyclingFtp,
    runPaceSecondsPerKm: dto.runPaceSecondsPerKm,
    swimPaceSecondsPer100m: dto.swimPaceSecondsPer100m,
  };
}

export const apiSettingsService: SettingsService = {
  async readMetrics() {
    return toMetrics(await api.get<AthleteMetricsDTO>('/v1/profile/metrics'));
  },

  async updateMetrics(_uid, changes: MetricsChanges) {
    // The API refuses an empty patch rather than reporting a no-op as success.
    // Nothing is gained by making the round trip to be told that.
    if (Object.keys(changes).length === 0) {
      return this.readMetrics(_uid);
    }

    return toMetrics(await api.patch<AthleteMetricsDTO>('/v1/profile/metrics', changes));
  },

  async readPreferences(uid): Promise<Preferences> {
    return localSettingsStore.readPreferences(uid);
  },

  async updatePreferences(uid, changes): Promise<Preferences> {
    return localSettingsStore.updatePreferences(uid, changes);
  },

  async readIntegrations(uid): Promise<Integrations> {
    return localSettingsStore.readIntegrations(uid);
  },

  async updateIntegrations(uid, changes: IntegrationChanges): Promise<Integrations> {
    return localSettingsStore.updateIntegrations(uid, changes);
  },

  async readSubscription(uid): Promise<Subscription> {
    return localSettingsStore.readSubscription(uid);
  },

  async redeemCode(_uid, code) {
    // No billing backend to ask. Refusing an obviously empty code is the one
    // check that can be made honestly here; anything else would be theatre.
    if (!code.trim()) {
      throw new Error('Enter a referral code.');
    }
  },
};
