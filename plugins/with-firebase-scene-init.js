const { withAppDelegate } = require('expo/config-plugins');

const CONFIGURE = 'FirebaseApp.configure()';

/**
 * @react-native-firebase/app@26.4.0's config plugin injects `FirebaseApp.configure()`
 * by anchoring on `factory.startReactNative(` (or ObjC's `self.moduleName =`):
 *
 *   methodInvocationLineMatcher = /(?:self\.moduleName\s*=\s*"([^"]*)")|(?:factory\.startReactNative\()/
 *
 * Expo SDK 58 adopted the UIKit scene-based life cycle (required by the iOS 27
 * SDK), which moved `factory.startReactNative(` out of AppDelegate and into
 * SceneDelegate. The anchor no longer matches, so the plugin adds
 * `import FirebaseCore` but never the configure() call — and the app boots with
 * "No Firebase App '[DEFAULT]' has been created".
 *
 * Inject it ourselves, immediately before AppDelegate's `return super.application(`.
 * Remove this once @react-native-firebase supports the scene-based template.
 */
module.exports = function withFirebaseSceneInit(config) {
  return withAppDelegate(config, config => {
    const { contents, language } = config.modResults;

    if (language !== 'swift') {
      throw new Error(`with-firebase-scene-init: expected a Swift AppDelegate, got "${language}".`);
    }
    if (contents.includes(CONFIGURE)) {
      return config; // RNFB's own injection worked, or we already ran.
    }

    const anchor = /(\n(\s*)return super\.application\(\s*\n?\s*application,\s*\n?\s*didFinishLaunchingWithOptions:)/;
    const match = contents.match(anchor);
    if (!match) {
      throw new Error(
        'with-firebase-scene-init: could not find `return super.application(... ' +
          'didFinishLaunchingWithOptions:` in AppDelegate.swift. The Expo template ' +
          'changed — update this plugin rather than shipping without Firebase init.',
      );
    }

    const indent = match[2];
    config.modResults.contents = contents.replace(
      anchor,
      `\n${indent}${CONFIGURE}\n$1`,
    );
    return config;
  });
};
