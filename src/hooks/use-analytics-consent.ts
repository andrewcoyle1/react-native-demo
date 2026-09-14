/**
 * Analytics consent, bound to the athlete who gave it.
 *
 * The stored answer lives in `device-preferences`, which sits above
 * `AuthProvider` on purpose — it holds things belonging to the install, and
 * signing out must not reset them. That leaves it unable to see who is signed
 * in, so the two are joined here instead.
 *
 * The join is the point. A consent recorded against one uid is not an answer
 * for another: delete the account and create a new one and the new athlete
 * would otherwise be tracked having never been asked, which is what happened
 * before this existed. A stored answer from someone else reads as `null` —
 * unasked — and `null` both raises the prompt and keeps tracking off.
 */
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/providers/auth-provider';
import { useDevicePreferences, type AnalyticsConsent } from '@/providers/device-preferences';
import { useServices } from '@/providers/services-provider';
import { reportError, setAnalyticsConsent } from '@/services/telemetry';

export type AnalyticsConsentValue = {
  /** False until both the stored answer and the auth state have resolved. */
  ready: boolean;
  /** The current athlete's own answer. `null` means they have not given one. */
  consent: AnalyticsConsent;
  /** Records an answer for the athlete who is signed in right now. */
  record: (value: Exclude<AnalyticsConsent, null>) => void;
};

export function useAnalyticsConsent(): AnalyticsConsentValue {
  const { user, initializing } = useAuth();
  const services = useServices();
  const {
    ready: preferencesReady,
    analyticsConsent,
    analyticsConsentUid,
    setAnalyticsConsent: store,
  } = useDevicePreferences();

  const uid = user?.uid ?? null;
  const ready = preferencesReady && !initializing;
  const consent: AnalyticsConsent =
    uid !== null && analyticsConsentUid === uid ? analyticsConsent : null;

  return {
    ready,
    consent,
    record: value => {
      if (uid === null) {
        // Nothing to attribute the answer to. Unreachable from the UI, which
        // only offers this to a signed-in athlete.
        return;
      }
      store(value, uid);

      /*
       * The device copy above decides behaviour; this one is the record that
       * Article 7(1) asks for. Deliberately not awaited: the athlete's choice
       * takes effect locally whether or not the network is there, and blocking
       * the screen on a write whose only purpose is evidence would be a poor
       * trade. A failure is reported rather than retried — the honest state is
       * then "the device knows, the server does not", which the next answer
       * will correct.
       */
      services.consent
        .recordAnalytics(uid, value === 'granted')
        .catch(caught => reportError(caught, 'consent: recordAnalytics'));
    },
  };
}

/**
 * Applies the current athlete's answer to the analytics vendor.
 *
 * Mount this **once**, at the root. It is deliberately separate from
 * `useAnalyticsConsent`, which several screens read: if applying lived in the
 * read hook, every one of those screens would issue its own opt-in or opt-out
 * on mount. They are idempotent, but a vendor write is not something four
 * components should be racing to perform, and Mixpanel's opt-out deletes the
 * user's profile when it lands on an identified session.
 */
export function useApplyAnalyticsConsent(): void {
  const { ready, consent } = useAnalyticsConsent();

  /*
   * The service starts opted out, so this is the only thing that can turn
   * tracking on — and it is also what turns it back off, both for a revoked
   * answer and, just as importantly, for an athlete who has not answered at
   * all. Without that second case, deleting an account and creating another
   * within one launch leaves the vendor opted in on the previous athlete's
   * consent, which is exactly the hole this hook was written to close.
   *
   * Waiting on `ready` matters: applying while auth is still resolving reads
   * the signed-in athlete as absent, opting out and then straight back in, for
   * a spurious opt-in event on every launch.
   */
  useEffect(() => {
    if (!ready) {
      return;
    }
    setAnalyticsConsent(consent === 'granted');
  }, [ready, consent]);
}

/**
 * Raises the consent prompt the first time a signed-in athlete lands somewhere
 * that can show it.
 *
 * Called from both `(setup)` and `(main)` rather than from the root, because
 * the root renders while the navigator is still deciding which of the three
 * sides to show and a push into that is a race. The two call sites are the two
 * places a signed-in athlete can first arrive: someone new goes through setup,
 * someone who already has a profile goes straight to the tabs. Whichever it is,
 * they are asked once, and `consent === null` keeps it from firing twice.
 */
export function useAnalyticsConsentPrompt(): void {
  const { ready, consent } = useAnalyticsConsent();

  useEffect(() => {
    if (ready && consent === null) {
      router.push('/settings/analytics');
    }
  }, [ready, consent]);
}
