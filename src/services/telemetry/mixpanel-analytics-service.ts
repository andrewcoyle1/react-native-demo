/**
 * Mixpanel implementation of `AnalyticsService`.
 *
 * Replaces Firebase Analytics. Crash reporting is a separate seam and stays on
 * Crashlytics — see `firebase-crash-service.ts`.
 *
 * Every method here returns `void` and is fire-and-forget, which is what lets
 * the async `init()` stay invisible to callers: calls made during launch queue
 * behind `ready` instead of being dropped.
 */
import Constants from 'expo-constants';
import { Mixpanel } from 'mixpanel-react-native';

import type { AnalyticsService } from './telemetry-service';
import { swallow, trace } from './logging';

import { environment, flags, mixpanelServerUrl } from '@/config/environment';

/** How long to wait for an opt-in to become visible to the SDK's own guards. */
const OPT_IN_POLL_ATTEMPTS = 20;
const OPT_IN_POLL_INTERVAL_MS = 25;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Builds the service and starts initialising it.
 *
 * A factory rather than a module-level constant for the same reason the crash
 * service is one: the composition root imports every implementation, so a
 * vendor call at module scope would fire even when another is selected.
 */
export function createMixpanelAnalyticsService(token: string): AnalyticsService {
  /*
   * `trackAutomaticEvents: false` — that flag is Mixpanel's legacy mobile
   * autotrack. Leaving it on fills the project with events we did not design
   * and cannot reconcile with the ones we did.
   */
  const mixpanel = new Mixpanel(token, false);

  /*
   * Stamped on every event. `environment` is the one that matters: without it,
   * simulator traffic and real traffic are indistinguishable inside a project,
   * and `api` currently shares the dev project with `dev`.
   */
  const superProperties = {
    environment,
    app_version: Constants.expoConfig?.version ?? 'unknown',
  };

  /*
   * `optOutTrackingDefault: true` — the consent gate.
   *
   * The athlete may be in the EU or California, where tracking needs consent
   * given, not assumed. Mixpanel therefore starts opted out and queues nothing;
   * `setConsent(true)` is the only thing that opens it, driven by the stored
   * preference in `device-preferences`.
   */
  const ready = mixpanel
    .init(true, superProperties, mixpanelServerUrl)
    .then(() => {
      /*
       * Outside production, let the SDK narrate its own queueing and flushing.
       * Our `trace` only proves a call was made; this is what shows whether the
       * batch actually reached Mixpanel.
       *
       * After `init`, not before: the native side resolves the instance by
       * token, so this is a no-op against an instance that does not exist yet.
       */
      mixpanel.setLoggingEnabled(flags.verboseLogging);
      trace('init', { host: mixpanelServerUrl, environment });
    })
    .catch(swallow('mixpanel init'));

  /*
   * A serial queue, not a fan-out of `ready.then(...)`.
   *
   * Order matters here and the naive version does not preserve it. `identify`
   * is asynchronous; attaching every call to the same `ready` promise runs them
   * all in one microtask batch, so `getPeople().set()` fires while `identify`
   * is still in flight.
   *
   * Chaining each operation onto the previous one — and returning the promise
   * from async work so the chain waits for it — makes the call order the
   * delivery order.
   */
  let queue: Promise<unknown> = ready;

  function enqueue(operation: string, work: () => unknown) {
    queue = queue.then(work).catch(swallow(operation));
  }

  /*
   * The last identity we were given, remembered so consent can replay it.
   *
   * Consent is read from a file and auth from a listener, so consent arrives
   * *after* sign-in: the order on launch is identify → people.set → consent.
   * Both of those are dropped outright while opted out (see below), so opting
   * in has to re-apply whatever identity we last knew. This also covers
   * granting consent from Settings, where sign-in happened minutes earlier.
   */
  let lastUid: string | null = null;
  let lastUserProperties: Record<string, unknown> | null = null;

  /**
   * The consent this process has already applied, as opposed to the consent the
   * SDK persisted from a previous launch. `null` means we have not touched it.
   */
  let appliedConsent: boolean | null = null;

  /**
   * Blocks until the native SDK agrees it is opted in.
   *
   * This is not defensive padding, it is the whole fix. The native SDK checks
   * consent in two different places:
   *
   *   `track`    — inside its serial tracking queue, so it sees any opt-in
   *                submitted before it and survives.
   *   `identify` — synchronously, on the calling thread, *before* dispatching.
   *   `people.set` — likewise, synchronously, before dispatching.
   *
   * `optInTracking()` only flips the flag once its own queued block runs, but
   * resolves to JS immediately. So an `identify` issued in the same breath
   * reads the stale flag and returns without doing anything, and the profile
   * update that follows is stored against no identity and never flushed. That
   * asymmetry is exactly why events reached /track while nothing ever reached
   * /engage.
   *
   * `hasOptedOutTracking()` reads the same flag those guards read, so polling
   * it until it clears is a true barrier rather than a guessed sleep.
   */
  async function awaitOptIn(): Promise<boolean> {
    for (let attempt = 0; attempt < OPT_IN_POLL_ATTEMPTS; attempt += 1) {
      if (!(await mixpanel.hasOptedOutTracking())) {
        return true;
      }
      await delay(OPT_IN_POLL_INTERVAL_MS);
    }
    return false;
  }

  return {
    trackScreenView(screenName) {
      trace('screen_view', screenName);
      enqueue('trackScreenView', () =>
        mixpanel.track('screen_viewed', { screen_name: screenName }),
      );
    },

    trackEvent(name, params) {
      trace(`event ${name}`, params);
      enqueue('trackEvent', () => mixpanel.track(name, params));
    },

    setConsent(granted) {
      trace('consent', granted ? 'granted' : 'denied');
      enqueue('setConsent', async () => {
        if (!granted) {
          /*
           * Not merely a flag: Mixpanel also clears the queued events and the
           * stored distinct id, so revoking leaves nothing behind to send later.
           */
          mixpanel.optOutTracking();
          appliedConsent = false;
          return;
        }

        /*
         * Opting in is not idempotent — it tracks a `$opt_in` event every time —
         * and this runs on every launch, driven by the stored preference. So
         * only do it when the SDK is actually opted out.
         *
         * Two sources, because neither alone is trustworthy. `appliedConsent`
         * covers revoking and re-granting within a session, where the SDK's own
         * flag may not have caught up with the opt-out we just issued. The flag
         * covers a fresh launch, where we have applied nothing yet; reading it
         * is safe there because the only launch on which the SDK opts itself out
         * is one where consent is unanswered, and then this code does not run
         * until the athlete has answered the prompt.
         */
        if (appliedConsent !== false && !(await mixpanel.hasOptedOutTracking())) {
          appliedConsent = true;
          return;
        }

        mixpanel.optInTracking();
        if (!(await awaitOptIn())) {
          throw new Error('mixpanel did not opt in');
        }
        appliedConsent = true;

        /*
         * Opting out wipes the registered super properties, and the SDK opts
         * out once at init to honour `optOutTrackingDefault`. Without this,
         * every event after consent is missing `environment` — which is the
         * one property that separates simulator traffic from real traffic.
         */
        mixpanel.registerSuperProperties(superProperties);

        if (lastUid !== null) {
          await mixpanel.identify(lastUid);
        }
        if (lastUserProperties !== null) {
          mixpanel.getPeople().set(lastUserProperties);
        }
        /*
         * Consent is the moment the backlog becomes sendable, and it is a
         * once-per-launch event, so paying for a flush here is cheap and makes
         * the grant observable immediately rather than at the next timer tick.
         */
        mixpanel.flush();
      });
    },

    setUserProperties(properties) {
      trace('people.set', properties);
      lastUserProperties = properties;
      enqueue('setUserProperties', () => mixpanel.getPeople().set(properties));
    },

    identifyUser(uid) {
      trace('identify (mixpanel)', uid);
      lastUid = uid;
      if (uid === null) {
        lastUserProperties = null;
      }
      enqueue('identifyUser', () => {
        if (uid) {
          // Returned, not fire-and-forget: everything queued behind this —
          // `setUserProperties` above all — must wait for it to resolve.
          return mixpanel.identify(uid);
        }
        /*
         * Sign-out has to issue a new distinct id, not just forget the old one.
         * Without this the next person to sign in on the device inherits the
         * previous athlete's identity and their events merge.
         *
         * `reset` also clears the registered super properties, so put them
         * back: otherwise every event for the rest of the session is missing
         * `environment`, and nothing says so.
         */
        mixpanel.reset();
        mixpanel.registerSuperProperties(superProperties);
        return undefined;
      });
    },
  };
}
