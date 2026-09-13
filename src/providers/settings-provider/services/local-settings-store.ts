/**
 * The stand-in store for settings that have no column yet.
 *
 * Pool size, the per-discipline training days, every integration and the
 * subscription are modelled in full by `settings-service.ts` but persisted
 * nowhere: there is no schema for them, and no Garmin, Strava, calendar or
 * billing backend behind this repo at all. Rather than leave those screens
 * unbuildable, they read and write here.
 *
 * Module-level, so the values survive navigating between screens but not a
 * reload — which is the honest behaviour for something with no backing store,
 * and is deliberately not disguised with a cache that would look like
 * persistence. When the schema lands, the fix is to give `SettingsService` a
 * real implementation for these methods; no screen changes.
 */
import type {
  IntegrationChanges,
  Integrations,
  Preferences,
  Subscription,
  Weekday,
} from './settings-service';

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/*
 * The defaults a freshly set-up athlete sees. They match what the design shows
 * in its own screenshots, so the modals have something to render before
 * anything has been chosen.
 */
const defaults: {
  preferences: Preferences;
  integrations: Integrations;
  subscription: Subscription;
} = {
  preferences: {
    poolSize: '25m',
    availableDays: [...ALL_DAYS],
    swimDays: [...ALL_DAYS],
    cycleDays: [2, 4, 6, 0],
    runDays: [...ALL_DAYS],
    longRideDay: 0,
    longRunDay: 6,
    oneWorkoutDays: [],
  },
  integrations: {
    garmin: {
      connected: true,
      autoSend: true,
      cyclingMetric: 'watts',
      runningMetric: 'pace',
    },
    strava: {
      connected: true,
      renameActivities: true,
      athleteName: 'Andrew Coyle',
      athleteHandle: 'andrewcoyle',
    },
    calendar: {
      connected: true,
      lastSyncedAt: new Date(),
      feedUrl: 'https://example.com/calendar/private.ics',
    },
  },
  subscription: {
    active: false,
    /* A year out, so the trial copy reads sensibly whenever this is run. */
    trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  },
};

/** One entry per athlete, so signing into another account starts clean. */
const byUid = new Map<string, typeof defaults>();

function entry(uid: string) {
  let found = byUid.get(uid);
  if (!found) {
    found = structuredClone(defaults);
    byUid.set(uid, found);
  }
  return found;
}

export const localSettingsStore = {
  readPreferences(uid: string): Preferences {
    return entry(uid).preferences;
  },

  updatePreferences(uid: string, changes: Partial<Preferences>): Preferences {
    const current = entry(uid);
    current.preferences = { ...current.preferences, ...changes };
    return current.preferences;
  },

  readIntegrations(uid: string): Integrations {
    return entry(uid).integrations;
  },

  updateIntegrations(uid: string, changes: IntegrationChanges): Integrations {
    const current = entry(uid);
    // Merged one service deep: a change to Strava's rename switch must not
    // replace Garmin's whole entry with undefined.
    current.integrations = {
      garmin: { ...current.integrations.garmin, ...changes.garmin },
      strava: { ...current.integrations.strava, ...changes.strava },
      calendar: { ...current.integrations.calendar, ...changes.calendar },
    };
    return current.integrations;
  },

  readSubscription(uid: string): Subscription {
    return entry(uid).subscription;
  },
};
