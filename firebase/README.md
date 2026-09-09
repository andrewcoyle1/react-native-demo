# Firebase configuration files

Two files belong in this directory. They are **not** in the repository because they
are generated per Firebase project — download yours from the Firebase console.

| File | Where to get it |
| --- | --- |
| `google-services.json` | Project settings → General → Your apps → Android app `com.andrewcoyle.firebaseexpoapp` |
| `GoogleService-Info.plist` | Project settings → General → Your apps → iOS app `com.andrewcoyle.firebaseexpoapp` |

`app.json` points at both via `expo.android.googleServicesFile` and
`expo.ios.googleServicesFile`. `expo prebuild` fails with a missing-file error until
they exist.

The bundle/package identifiers you register in the Firebase console must match the
ones in `app.json` exactly, or the native SDKs will fail to initialize at launch.

These files contain no secrets — the API key in them is a client identifier, and
access is controlled by security rules — so committing them is safe. If you would
rather not, add them to `.gitignore` and supply them to EAS Build as file-type
environment variables instead.

## Security rules

`firestore.rules` holds the rules this app expects. Deploy them with:

```sh
firebase deploy --only firestore:rules
```
