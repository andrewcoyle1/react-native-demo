/**
 * Firestore implementation of `ConsentService`, over `users/{uid}`.
 *
 * `merge: true` rather than `updateDoc`: consent is answered at the top of
 * onboarding, before the profile document is written, so the document usually
 * does not exist yet and `updateDoc` would reject. Merging creates it holding
 * nothing but the decision, and the profile write later fills in the rest.
 */
import { doc, getFirestore, serverTimestamp, setDoc } from '@react-native-firebase/firestore';

import type { ConsentService } from './consent-service';

export const firebaseConsentService: ConsentService = {
  async recordAnalytics(uid, granted) {
    await setDoc(
      doc(getFirestore(), 'users', uid),
      {
        analyticsConsent: granted ? 'granted' : 'denied',
        // The server's clock, not the handset's: a record whose time the
        // subject can set is not much of a record.
        analyticsConsentAt: serverTimestamp(),
      },
      { merge: true },
    );
  },
};
