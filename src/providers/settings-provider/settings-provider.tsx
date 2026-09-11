/**
 * Settings provider.
 *
 * Everything the profile screen's modals read and write. Unlike the providers
 * around it, this one is not a subscription: none of these values changes
 * without this device changing it, so there is nothing to listen to. It loads
 * once per signed-in athlete and each mutator returns the settled value, which
 * is then held here.
 *
 * Mutators resolve with the new value rather than merely succeeding, so a modal
 * can close on the value the store actually settled on instead of on the one it
 * asked for — the two differ the moment a server clamps or rounds a figure.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { mockSettingsService } from './services/mock-settings-service';
import type {
  AthleteMetrics,
  IntegrationChanges,
  Integrations,
  MetricsChanges,
  Preferences,
  SettingsService,
  Subscription,
} from './services/settings-service';

import { useAuth } from '@/providers/auth-provider';
import { reportError } from '@/services/telemetry';

/** Everything arrives together, so one status covers the lot. */
type Loaded = {
  metrics: AthleteMetrics;
  preferences: Preferences;
  integrations: Integrations;
  subscription: Subscription;
};

export type SettingsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | ({ status: 'ready' } & Loaded);

type SettingsContextValue = {
  state: SettingsState;
  updateMetrics: (changes: MetricsChanges) => Promise<void>;
  updatePreferences: (changes: Partial<Preferences>) => Promise<void>;
  updateIntegrations: (changes: IntegrationChanges) => Promise<void>;
  redeemCode: (code: string) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

type SettingsProviderProps = PropsWithChildren<{ service?: SettingsService }>;

export function SettingsProvider({
  children,
  service = mockSettingsService,
}: SettingsProviderProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  /*
   * Stamped with the account it belongs to, and read back below only when that
   * still matches. Signing out is therefore not something this has to *clear* —
   * the stamp stops matching and the value is simply no longer used, which
   * keeps the effect free of a synchronous setState and makes it impossible for
   * one account's settings to be shown to the next.
   */
  const [loaded, setLoaded] = useState<{ uid: string; state: SettingsState } | null>(null);

  useEffect(() => {
    if (!uid) {
      return;
    }

    // Guards against a resolved load from the previous account landing on top
    // of this one after a fast account switch.
    let current = true;

    Promise.all([
      service.readMetrics(uid),
      service.readPreferences(uid),
      service.readIntegrations(uid),
      service.readSubscription(uid),
    ])
      .then(([metrics, preferences, integrations, subscription]) => {
        if (current) {
          setLoaded({
            uid,
            state: { status: 'ready', metrics, preferences, integrations, subscription },
          });
        }
      })
      .catch((error: unknown) => {
        if (!current) {
          return;
        }
        reportError(error, 'settings: load');
        setLoaded({
          uid,
          state: { status: 'error', message: 'Could not load your settings.' },
        });
      });

    return () => {
      current = false;
    };
  }, [uid, service]);

  /**
   * Applies one slice of the settled value.
   *
   * Every mutator below is the same shape, and each rethrows: the modal that
   * called it is what shows the failure, and swallowing it here would leave the
   * athlete looking at a dialog that closed as though it had saved.
   */
  const commit = useCallback(
    async <K extends keyof Loaded>(key: K, run: (uid: string) => Promise<Loaded[K]>) => {
      if (!uid) {
        return;
      }

      try {
        const settled = await run(uid);
        setLoaded(previous =>
          previous?.uid === uid && previous.state.status === 'ready'
            ? { uid, state: { ...previous.state, [key]: settled } }
            : previous,
        );
      } catch (error) {
        reportError(error, `settings: update ${key}`);
        throw error;
      }
    },
    [uid],
  );

  const updateMetrics = useCallback(
    (changes: MetricsChanges) =>
      commit('metrics', id => service.updateMetrics(id, changes)),
    [commit, service],
  );

  const updatePreferences = useCallback(
    (changes: Partial<Preferences>) =>
      commit('preferences', id => service.updatePreferences(id, changes)),
    [commit, service],
  );

  const updateIntegrations = useCallback(
    (changes: IntegrationChanges) =>
      commit('integrations', id => service.updateIntegrations(id, changes)),
    [commit, service],
  );

  const redeemCode = useCallback(
    async (code: string) => {
      if (!uid) {
        return;
      }
      await service.redeemCode(uid, code);
    },
    [uid, service],
  );

  /* Loading covers both "no account yet" and "this account's load is in
     flight", which are the same thing as far as a screen is concerned.
     Memoised so the fresh object literal does not make `value` a new identity
     on every render. */
  const state = useMemo<SettingsState>(
    () => (uid && loaded?.uid === uid ? loaded.state : { status: 'loading' }),
    [uid, loaded],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ state, updateMetrics, updatePreferences, updateIntegrations, redeemCode }),
    [state, updateMetrics, updatePreferences, updateIntegrations, redeemCode],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings must be used inside <SettingsProvider>');
  }
  return value;
}
