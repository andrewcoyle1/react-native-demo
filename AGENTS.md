# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Mixpanel analytics

Product analytics is Mixpanel; crash reporting is Crashlytics. They are two
separate seams — `AnalyticsService` and `CrashService` in
`src/services/telemetry/telemetry-service.ts` — and the composition root
(`src/services/container.ts`) decides which implementations are used.

The facade reads `telemetry/registry.ts`, never the container: the container
imports every implementation and several of those import the facade back, which
closed an import cycle. `createServices` pushes its choice into the registry as
it builds. The registry defaults to the mocks, so `[telemetry:mock]` appearing
outside the mock environment means something called the facade before the
container was built.

**Never import a vendor SDK in a screen or provider.** Call the facade:

```ts
import { trackEvent, trackScreenView, identifyUser, setUserProperties } from '@/services/telemetry';
```

| Thing            | Where                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| Platform / SDK   | React Native (Expo), `mixpanel-react-native` native mode                      |
| Token            | `EXPO_PUBLIC_MIXPANEL_TOKEN_DEV` / `_PROD` in `.env.local` (gitignored)       |
| Token resolution | `mixpanelToken` in `src/config/environment.ts` — `api` shares the dev project |
| Init             | `src/services/telemetry/mixpanel-analytics-service.ts`                        |
| Identity         | `src/providers/auth-provider/auth-provider.tsx`                               |
| Consent          | `src/providers/device-preferences/`, UI at `src/app/settings/analytics.tsx`   |

## Consent is mandatory

There are EU/California users, so **Mixpanel initialises opted out**
(`optOutTrackingDefault: true`). Nothing is transmitted until
`setAnalyticsConsent(true)` runs, driven by the stored `analyticsConsent`
preference. `null` (never asked) is deliberately distinct from `'denied'`:
both mean no tracking, only `null` raises the prompt. Do not add a code path
that tracks before consent, and do not fold crash reporting into this gate —
crash reports are not behavioural tracking and stay on for everyone.

The consent copy in `settings/analytics.tsx` must describe the tracking as
**linked to the athlete's account**, never as anonymous. Events are keyed to the
Firebase uid, carry profile properties, and Mixpanel derives a coarse location
from the request IP. That is pseudonymous, and GDPR treats pseudonymous data as
personal data. Consent is only valid if it is informed, so the word "anonymous"
here would undermine the gate rather than merely overstate it.

## Tracking plan

Value Moment: **`session_completed`**.

| Event                                  | Fires                                                            | Properties                                                         |
| -------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `session_completed`                    | `sessions-provider.tsx` `markComplete`, non-null completion only | `discipline`, `purpose`, `duration_minutes`, `matched_to_activity` |
| `sign_up_completed`                    | `(onboarding)/sign-up.tsx`, after `identify()`                   | `sign_up_method`, `platform`                                       |
| `setup_step_completed`                 | `OnboardingStep`'s Next, and the four card-tap screens           | `step`, `flow`, `step_number`, `step_count`                        |
| `onboarding_completed`                 | `plan-overview.tsx`, after the write succeeds                    | `flow`, `step_count`                                               |
| `screen_viewed`                        | `use-screen-tracking.ts`, on focus                               | `screen_name`                                                      |
| `feedback_submitted`                   | `modal.tsx`                                                      | `category`, `length`                                               |
| `auth_action_succeeded` / `_failed`    | auth screens, profile                                            | `action`, `code`                                                   |
| `account_action_succeeded` / `_failed` | `profile/index.tsx`                                              | `action`, `code`                                                   |

Super properties (set at init): `environment`, `app_version`.
User profile properties: `auth_provider`, `email_verified` — never the email itself.

## Naming rules

- `snake_case`, `object_verb`, past tense — `session_completed`, not `CompleteSession`.
- Mixpanel is **case-sensitive**; `screen_viewed` ≠ `Screen Viewed`.
- Never build an event or property name at runtime — put the variable in a property.
- Never send numbers as quoted strings; they stop being aggregatable.
- Omit a property that does not apply rather than sending `null` or `''`.
- One event, one meaning. Before adding an event, check whether an existing one
  extended with a property would answer the same question.

## Ordering that matters

1. Create the user, 2. `identifyUser(uid)`, 3. `setUserProperties(...)`,
2. `trackEvent('sign_up_completed', ...)`. Profile attributes set before
   `identify` may not survive the merge, and an event tracked before it is
   attributed to the anonymous device.

`identifyUser(null)` on sign-out calls Mixpanel's `reset()`. Without it the
next athlete on the device inherits the previous one's identity.

## Consent belongs to a person, not a handset

The stored answer carries the uid that gave it (`analyticsConsentUid`), and
`useAnalyticsConsent` treats an answer from a different uid as unanswered. Delete
an account and create another and the new athlete is asked again, because they
have not answered. Read consent through that hook, never straight from
`device-preferences`.

`useApplyAnalyticsConsent` is what pushes the answer to the vendor, and is mounted
**once**, in `RootNavigator` — at the root rather than in `(main)` so that signing
out turns tracking off too. Do not move the vendor write into the read hook: four
screens read consent, and Mixpanel's opt-out deletes the user's profile when it
lands on an identified session.

The prompt is raised by `useAnalyticsConsentPrompt`, from **`(setup)/_layout` and
`(main)/_layout`** — the two places a signed-in athlete first lands. Asking at the
top of personalisation is deliberate: the twenty-odd screens below it are the
funnel most worth seeing, and consent given afterwards cannot describe them,
because nothing is queued while opted out. It costs some completion, and that
cost is accepted rather than overlooked.

Every answer is also written to the account through `services.consent`
(`PUT /v1/profile/consent`, stored on `users` — it is answered before a profile
row exists). The device copy decides behaviour; the server copy is the Article
7(1) record, with the timestamp that makes it one. It is never read back: under
ePrivacy the gated act is storing identifiers on the device, so a new device is
a new question.

## A guarded route is a redirect, not a missing one

In expo-router 58 a screen behind a false `Stack.Protected` guard is **not
removed** — it renders as a redirect to `redirectTo`. So pushing a guarded-off
route does not fail, and does not no-op: it navigates somewhere else.

That cost a day. `settings` sat inside the root's `!!user && !needsSetup` guard
while `(setup)/_layout` raised the consent prompt by pushing
`/settings/analytics` on mount. For a brand-new athlete the guard was false, so
the push redirected to `redirectTo` — `/race-or-not`, the setup flow's own
landing screen — which remounted the setup layout, which raised the prompt
again. `/race-or-not` stacked on itself until the app was unusable, and the
consent screen was never reachable.

`settings` is therefore guarded on `!!user` alone. Before pushing a route from a
layout effect, check which guard the target sits behind and whether that guard
is true from where the push happens. `__tests__/consent-prompt-route-test.tsx`
holds this, and fails if the guard narrows again.

## Measuring the funnel

`setup_step_completed` is forward-only, which `screen_viewed` is not — the latter
re-fires when the athlete taps back, so a funnel built on it double-counts. Use
`setup_step_completed` for conversion between steps, `screen_viewed` for
attention.

Do **not** measure onboarding completion rate in Mixpanel. Consent-gated
analytics cannot measure the effect of the consent prompt: everyone who declines
is absent by construction, so moving the prompt earlier makes the funnel look
_cleaner_ while losing more people. The unbiased denominator is server-side —
accounts created versus `/v1/onboarding/complete` received.

## The consent/identity trap

The native SDK checks consent in two different places, and the difference is
not cosmetic:

- `track` checks it **inside** its serial tracking queue, so it sees any
  `optInTracking()` submitted before it.
- `identify` and `people.set` check it **synchronously, before** dispatching.

`optInTracking()` returns to JS immediately but only flips the flag when its own
queued block runs. So an `identify` issued in the same breath reads the stale
flag and returns having done nothing, and the profile update behind it is stored
against no identity and never flushed. The symptom is events arriving normally
while `/engage` is never called at all — which is what happened here.

`setConsent` therefore polls `hasOptedOutTracking()` until it clears before
re-applying identity. That poll is the fix, not padding; do not delete it, and do
not replace it with a fixed delay.

Two more things that follow from the same area:

- `optOutTracking()` **wipes the registered super properties**, and the SDK opts
  itself out once at init to honour `optOutTrackingDefault`. Super properties are
  re-registered on opt-in, or every event loses `environment`.
- `optInTracking()` tracks a `$opt_in` event every time it is called, so it runs
  only when the SDK is genuinely opted out — see `appliedConsent`.
- The ingestion host must match the project's **data residency region**
  (`EXPO_PUBLIC_MIXPANEL_REGION`). An EU or India project drops everything posted
  to the US host while still answering `1`, which is indistinguishable from
  working.

## Verifying it end to end

`console.log` goes to Metro, not the device log, and proves only that a call was
made. To see what actually left the device, run the SDK's own logging — it is
already enabled outside production — and read the app's stdout:

```
xcrun simctl launch --console-pty booted com.andrewcoyle.firebaseexpoapp > mp.log 2>&1 &
grep -ao "api\.mixpanel\.com/[a-z]*" mp.log | sort | uniq -c
```

`Successfully deleted rows` does **not** mean Mixpanel accepted the batch — the
SDK deletes on any HTTP success, including a rejection. Nor does a `1` response:
Mixpanel's ingestion answers `1` to an invented token. The only negative signal
the SDK gives is an `api rejected some items` line, and the only positive proof
is the data appearing in the project. Treat "it was sent" and "it arrived" as two
separate claims.
Check the bundle URL in that log first: a dev client pointed at a different Metro
port will happily serve a stale bundle and every conclusion drawn from it is
worthless.

# Composition root

`createServices(env)` in `src/services/container.ts` builds the dependencies for
an environment and returns them. It is a **function, not a constant** — as a
constant the environment was fixed at import time, there was one container per
process, and nothing below it could be built over fakes without mocking the
module. `createServices('mock')` gives a full mock container with no env vars
and no Firebase.

`_layout.tsx` calls it once in a `useMemo` and passes the result down through
`ServicesProvider`. Read it with `useServices()`; there is no module-level
`services` export any more, and nothing should reintroduce one. Providers still
take the service they need as a prop — a provider that reaches for a global
cannot be mounted twice with different backing.

Two things that will bite:

- **`mixpanelToken` and `mixpanelServerUrl` must stay read from
  `config/environment.ts`**, not derived from the `env` argument. Metro inlines
  `EXPO_PUBLIC_*` by substituting the literal source text at bundle time, so a
  value reached through a variable is never substituted and reads as undefined.
- The container is memoised on mount, so **editing `container.ts` needs a full
  reload**, not Fast Refresh.

Several mock services hold module-level `Map`/`Set` state. Harmless with one
container; a trap the day two exist in one process.

# Tests

Two suites, two runners, deliberately separate:

- **Client** — `npm test` (Jest, `jest-expo` preset, `__tests__/`).
- **Server** — `cd server && npm test` (node:test against a real Postgres via
  `docker compose up -d`). Jest ignores `server/`.

`jest.setup.ts` stubs the Firebase and Mixpanel SDKs. Not because tests want
fake vendors, but because the container imports every implementation in order to
choose between them and Firebase touches the native layer as it loads. Keep the
stubs inert: anything that needs behaviour should be tested against the mock
services instead, which is what they are for.

Build dependencies with `createServices('mock')` and wrap the component under
test in `ServicesProvider`. Do not reach for `jest.mock` on the container.

Toolchain gotchas that cost time once:

- `@testing-library/react-native` v14 needs the **`test-renderer`** package — a
  peer dependency, and the React 19 replacement for `react-test-renderer`.
- Its `render` is **async**. Without the await the component never runs and
  every assertion reads `undefined`, which looks like a broken hook.
- `jest.mock` factories are hoisted above the file, so a fixture they close over
  must be named `mock*` or Jest refuses it.
- Installing anything here needs `--legacy-peer-deps`, from the pre-existing
  `@react-native-firebase/analytics` conflict.

A test is worth having if it fails when the behaviour regresses. The consent
suite was checked that way — by putting the original bug back and confirming
four of the eight go red.
