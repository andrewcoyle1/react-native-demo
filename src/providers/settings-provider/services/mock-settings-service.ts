/**
 * `SettingsService` with no backend behind any of it.
 *
 * Used by the `mock` environment and by `firebase`. Firebase gets this one
 * rather than an implementation of its own for the same reason the onboarding
 * service has no Firebase plan generation: threshold figures were never built
 * there, so there is nothing to read. Pointing it here keeps the profile
 * screen's modals working under every environment instead of leaving them
 * inert under two of the three.
 */
import { localSettingsStore } from './local-settings-store';
import type { AthleteMetrics, MetricsChanges, SettingsService } from './settings-service';

/** Figures to open on, so the screens have something to show. */
const metricsByUid = new Map<string, AthleteMetrics>();

const defaults: AthleteMetrics = {
  heartRateMin: 35,
  heartRateMax: 201,
  cyclingFtp: null,
  runPaceSecondsPerKm: 270,
  swimPaceSecondsPer100m: null,
};

function metrics(uid: string): AthleteMetrics {
  let found = metricsByUid.get(uid);
  if (!found) {
    found = { ...defaults };
    metricsByUid.set(uid, found);
  }
  return found;
}

export const mockSettingsService: SettingsService = {
  async readMetrics(uid) {
    return { ...metrics(uid) };
  },

  async updateMetrics(uid, changes: MetricsChanges) {
    // Spreading `changes` is the right merge here: an absent key is untouched
    // and a key set to null clears the figure, which is exactly the contract.
    const next = { ...metrics(uid), ...changes };
    metricsByUid.set(uid, next);
    return { ...next };
  },

  async readPreferences(uid) {
    return localSettingsStore.readPreferences(uid);
  },

  async updatePreferences(uid, changes) {
    return localSettingsStore.updatePreferences(uid, changes);
  },

  async readIntegrations(uid) {
    return localSettingsStore.readIntegrations(uid);
  },

  async updateIntegrations(uid, changes) {
    return localSettingsStore.updateIntegrations(uid, changes);
  },

  async readSubscription(uid) {
    return localSettingsStore.readSubscription(uid);
  },

  async redeemCode(_uid, code) {
    if (!code.trim()) {
      throw new Error('Enter a referral code.');
    }
  },
};
