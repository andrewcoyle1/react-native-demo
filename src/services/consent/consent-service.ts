/**
 * The consent seam: recording an analytics decision against the account.
 *
 * Separate from the *device* copy in `device-preferences`, and neither is
 * redundant. The device copy decides behaviour — what the app does on this
 * handset, readable with no network and before any request can be made. This
 * one is the record: GDPR Article 7(1) puts the burden on us to demonstrate
 * that consent was given, and a JSON file that dies with the install
 * demonstrates nothing.
 *
 * Write-only on purpose. Reading the answer back to skip the prompt on a new
 * device would be the wrong behaviour as well as more code: under ePrivacy the
 * gated act is storing identifiers on the athlete's device, so a fresh device
 * is a fresh question.
 */
export interface ConsentService {
  /**
   * Records the decision. Rejects on failure so the caller can report it —
   * but no caller should let it block the athlete.
   */
  recordAnalytics(uid: string, granted: boolean): Promise<void>;
}
