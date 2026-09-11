const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * @react-native-firebase/crashlytics generates a build phase whose SPM branch
 * invokes upload-symbols with a hardcoded `-gsp "${PROJECT_DIR}/GoogleService-Info.plist"`.
 * PROJECT_DIR is the folder holding the .xcodeproj (ios/), but Expo prebuild
 * writes the plist into the app target folder (ios/<Target>/), so the build
 * fails with "Unable to read Google Service plist at path .../ios/GoogleService-Info.plist".
 *
 * The CocoaPods branch of that script auto-discovers the plist, which is why
 * this only bites when Firebase resolves via SPM.
 *
 * Copy the same plist ios.googleServicesFile already points at up to ios/ so
 * both locations exist. Runs on every prebuild, so it survives --clean.
 */
module.exports = function withCrashlyticsGoogleServicePlist(config) {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const source = config.ios?.googleServicesFile;
      if (!source) {
        throw new Error(
          'with-crashlytics-gsp: expo.ios.googleServicesFile is not set in app.json.',
        );
      }

      const from = path.resolve(config.modRequest.projectRoot, source);
      if (!fs.existsSync(from)) {
        throw new Error(`with-crashlytics-gsp: no GoogleService-Info.plist at ${from}`);
      }

      const to = path.join(config.modRequest.platformProjectRoot, 'GoogleService-Info.plist');
      fs.copyFileSync(from, to);
      return config;
    },
  ]);
};
