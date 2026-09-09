# Firebase Expo App

An Expo (SDK 57) app wired to [React Native Firebase](https://rnfirebase.io) v26 with
Authentication, Cloud Firestore, Analytics, and Crashlytics.

React Native Firebase uses native code, so **this app cannot run in Expo Go**. You
need a [development build](https://docs.expo.dev/develop/development-builds/introduction/).
There is also no web support — the `web` target has been removed from `app.json`.

## Setup

1. **Create a Firebase project** and register two apps in it, using these identifiers
   (or change them in `app.json` first):
   - Android package: `com.andrewcoyle.firebaseexpoapp`
   - iOS bundle ID: `com.andrewcoyle.firebaseexpoapp`

2. **Download the config files** into `firebase/` — see [`firebase/README.md`](./firebase/README.md).
   `expo prebuild` fails until both files exist.

3. **Enable the sign-in methods** you want under Authentication → Sign-in method.
   The Account screen uses Email/Password and Anonymous.

4. **Create the Firestore database** and deploy the rules in
   [`firebase/firestore.rules`](./firebase/firestore.rules).

5. **Install and build:**

   ```sh
   npm install
   npm run prebuild        # expo prebuild --clean, generates ios/ and android/
   npm run ios             # or: npm run android
   ```

   Subsequent JS-only changes just need `npm start`.

## What's in here

| Path | Purpose |
| --- | --- |
| `src/app/index.tsx` | Account tab — email/password and anonymous sign-in, session details |
| `src/app/notes.tsx` | Notes tab — live Firestore listener over `users/{uid}/notes`, add and delete |
| `src/app/diagnostics.tsx` | Diagnostics tab — Firebase app info, test Analytics events, Crashlytics controls |
| `src/firebase/auth-context.tsx` | `AuthProvider` / `useAuth`, wraps `onAuthStateChanged` |
| `src/firebase/notes.ts` | All Firestore queries for the notes collection |
| `src/firebase/telemetry.ts` | Analytics + Crashlytics wrappers; screens never call those SDKs directly |
| `src/hooks/use-screen-tracking.ts` | Logs `screen_view` on tab focus |

All Firebase calls use the modular API (`getAuth()`, `getFirestore()`, …), which is
the only supported style in v26.

## Notes on the native setup

- `app.json` lists a config plugin for every Firebase module that ships one — `app`,
  `auth`, `analytics`, `crashlytics`. Firestore has no plugin and needs no entry.
- `expo-build-properties` sets `ios.useFrameworks: "dynamic"`. React Native Firebase
  resolves the Firebase Apple SDK through Swift Package Manager on RN 0.75+, and SPM
  requires dynamic frameworks. Removing this breaks the iOS build.
- `expo-dev-client` catches native crashes with its own error overlay, so the
  "Force a crash" button in Diagnostics will not produce a Crashlytics report in a
  dev build. Test it in a release build.
- Analytics events are batched on device and can take minutes to reach the console.
  Use [DebugView](https://firebase.google.com/docs/analytics/debugview) for immediate
  feedback.
