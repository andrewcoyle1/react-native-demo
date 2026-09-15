# Stamina

A triathlon training app. A coached plan, the week ahead, the session in front of
you, and what you actually did against what was asked.

Expo SDK 58 (preview) and React Native 0.87 over Node and Postgres — 50 screens,
three interchangeable backends behind one set of interfaces, and a test suite on
both sides of the wire. It runs with no setup at all:

```sh
npm install --legacy-peer-deps && npm run start:mock
```

The design is a faithful rebuild of [Stamina](https://joinstamina.com)'s iOS app,
worked from screenshots — not affiliated with them, and the design, branding and
coaching copy are theirs. Building against a design I could not negotiate with
was the point: an invented brief lets you route around the parts that are hard
to get right.

---

## Trying it

<!-- TODO: replace with the TestFlight / simulator build link before sending. -->

That command runs the **`mock` environment**: every dependency is an in-memory
fake, so it needs no API keys, no Firebase project, no Postgres and no network.

It cannot run in Expo Go — `@react-native-firebase/*` and `mixpanel-react-native`
are native modules — so this needs a [development build](https://docs.expo.dev/develop/development-builds/introduction/)
(`npx expo run:ios`) or the prebuilt one linked above.

Any email and password signs you in. Two addresses behave specially, so the
awkward states are reachable without clearing anything: `new@example.com` seeds
an empty account and `fail@example.com` always fails to sign in.

Worth opening:

- **A session.** Tap any workout on the Dashboard or Plan tab. The swim is the
  one to look at — its workout steps nest three levels deep, because that is how
  a swim set is actually written.
- **The alternate UI.** Profile → Appearance. Six screens have a second,
  complete build on gluestack-ui. It is a rebuild, not a re-skin: the decisions
  that differ are argued in each file's header.
- **Analytics consent.** It is asked at the top of personalisation, and refusing
  is a first-class answer rather than a dark pattern.

---

## What is in it

| Area                | What it does                                                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Onboarding**      | Email/password sign-up and sign-in, email verification                                                                                                                                             |
| **Personalisation** | 25 screens over two branches — a race and its goal, or an open training goal — with a progress bar that divides by the branch actually being walked                                                |
| **Dashboard**       | The plan card, the week's sessions, schedule shortcuts                                                                                                                                             |
| **Plan**            | A swipeable training week, planned work set against recorded activities                                                                                                                            |
| **Activities**      | Paged history of what was actually done                                                                                                                                                            |
| **Trends**          | Volume, fitness and fatigue over time                                                                                                                                                              |
| **Session detail**  | A planned session and its recorded activity as two halves of one sheet — targets, interval chart, coach note, the workout written out step by step, plus the map, laps and pace/HR/cadence streams |
| **Add a plan**      | The personalisation flow again, minus everything Settings already knows — six screens instead of twenty-four                                                                                       |
| **Settings**        | 13 screens: availability, thresholds, units, integrations, analytics consent                                                                                                                       |

---

## What is real, and what is not

Being specific about this seemed more useful than implying it is all finished.

**Real:**

- The whole client: every screen, both UI builds, all four environments.
- The API: 18 endpoints, 8 migrations, auth with refresh-token rotation
  (reuse of a consumed token revokes the whole family), 136 tests against a
  real Postgres.
- The `mock` environment end to end. It is the one to look at: it has the
  richest fixtures, and no other environment has data behind the newer screens.
- Analytics: a consent gate that actually gates, bound to the athlete rather
  than the handset.

**Stubbed, and honestly so:**

- **The training engine.** `generateFirstWeek` writes one session per available
  day, rotating run/ride/swim, titled "Getting started". It is a placeholder for
  the part that would actually be the product, and says so in its own comment.
  The rich sessions — steps, set bands, coach notes — exist in the `mock`
  fixtures and have no columns behind them yet.
- **Integrations.** Garmin, Strava and Zwift appear in the UI as destinations.
  Nothing syncs.
- **OAuth.** The wire contract has shapes for it; there is no route and no
  client. Email and password only.
- **Some affordances are drawn and inert** — the "View on" links, the connection
  rows. I would rather leave them visibly unfinished than pretend.

---

## Decisions worth explaining

The parts I would most want to be asked about.

**Three backends behind one seam.** Every feature is an interface —
`SessionsService`, `TrainingService`, `UserService` — and most have three
implementations: an in-memory mock, Firestore, and HTTP against the Node API.
Not all of them: `NotesService` has no HTTP implementation and `SettingsService`
no Firestore one, so those two features fall back rather than switch.
`createServices(env)` in
`src/services/container.ts` is a function rather than a constant, which is the
whole point: as a constant the environment was fixed at import time and nothing
below it could be built over fakes. This is why the app can run with no backend
at all, and why the client tests need no network.

**One wire contract, two codebases.** `src/domain/wire.ts` is imported by the
app _and_ by the server, which aliases `@/domain/*` to it. A renamed field fails
to compile twice instead of failing at runtime once. It caught a real break
mid-build: adding required fields to `SessionDTO` stopped the server compiling
in the same commit.

**Services are presentation-free.** A swim is `discipline: 'swim'` and
`distanceMetres: 2700`. That it is blue, that it reads "2700 m", and that its
icon is `figure.pool.swim` are decisions made in `src/presenters/`, which is
also why a second UI build could be added without touching a service.

**Consent belongs to a person, not a device.** The stored answer carries the uid
that gave it. Delete an account, make another on the same phone, and the new
athlete is asked again — because they have not answered. This started as a bug I
shipped and found by testing exactly that, and there is a regression test that
goes red if the binding is removed.

**Analytics that cannot measure itself.** `onboarding_completed` is tracked,
but the completion _rate_ is deliberately not computed from it. Consent-gated
analytics cannot measure the effect of a consent prompt: everyone who declines
is absent by construction, so moving the prompt earlier makes the funnel look
_cleaner_ while losing more people. The unbiased denominator is accounts created
versus `/v1/onboarding/complete` received — server-side, and not built yet.

`AGENTS.md` carries the rest, including several traps that cost real time — the
Mixpanel consent/identity race, EU data residency silently discarding
everything, and expo-router 58 rendering a guarded route as a _redirect_ rather
than removing it, which once stacked a screen on itself until the app was
unusable.

---

## Layout

```
src/
  app/            Routes. expo-router, file-based.
  components/     Presentation. alt/ is the gluestack build.
  presenters/     Domain values -> component props. Pure, no React.
  providers/      State per feature, each over a service interface.
  services/       The seams, and the composition root.
  domain/         Vocabulary shared with the server, wire.ts included.
server/
  src/            Fastify, one module per resource.
  migrations/     Plain SQL, applied on boot.
```

## Tests

```sh
npm test                          # client, Jest + jest-expo
cd server && docker compose up -d && npm test   # server, node:test + real Postgres
```

50 client and 136 server. The client suite favours the things that type-check
perfectly and still break: a three-level step tree that renders the wrong
workout, a consent answer that leaks between accounts, a route guard that
redirects where it should not. Several were checked by reintroducing the
original bug and confirming they go red.

## Running against the real backend

```sh
cd server && docker compose up -d && npm run migrate && npm run dev
npm run start:api
```

`api` points at Node and Postgres; `dev` and `prod` both point at Firebase and
differ only in which Mixpanel project they report to and whether Crashlytics is
on. Every screen is the same in all four, with two exceptions worth knowing:
notes are read from Firestore even under `api`, and the threshold figures in
Settings are mock data anywhere but `api`.
