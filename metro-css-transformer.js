/**
 * Routes CSS files to the right compiler.
 *
 * react-native-css installs itself as Metro's transformer for the whole
 * project, and compiles *every* `.css` file in the graph into a native
 * stylesheet module. That is more than it should claim. `@expo/log-box` — the
 * dev-only error overlay — ships `toast/ErrorToast.module.css`, and
 * `expo-router/entry` loads LogBox at the very top of the app:
 *
 *   entry.js → entry-classic.js → renderRootComponent.js
 *     → @expo/log-box/index.js → toast/ErrorToast.js
 *     → toast/ErrorToast.module.css
 *     → react-native-css/native-internal → root.js → reactivity.js
 *
 * Compiling that CSS gives it an import of react-native-css's runtime, which
 * forces the runtime to initialise from inside the app's entry module, before
 * React Native has finished initialising. `native/reactivity.ts` evaluates
 * `Dimensions.get("window")` at module scope, `Dimensions` is still undefined
 * that early, and the app dies with "Cannot read property 'get' of undefined"
 * before the runtime is ready.
 *
 * It only bites in development, because LogBox is only in the dev bundle —
 * production exports for all three platforms build and run without it, so
 * nothing short of launching the app catches this.
 *
 * The rule below is the one that was true before NativeWind was installed:
 * this project's own CSS is a stylesheet to compile, and a `.css` file inside
 * a dependency is Expo's to handle exactly as it did before — which on native
 * means it contributes nothing. LogBox's stylesheet is for web and was never
 * meant to become a native stylesheet.
 */
const path = require('path');

const expoWorker = require('@expo/metro-config/build/transform-worker/transform-worker');

const isStylesheet = (filePath) => /\.(s?css|sass)$/.test(filePath);

/** Ours if it lives in `src/`. Anything under node_modules is not. */
function isProjectStylesheet(projectRoot, filePath) {
  const absolute = path.resolve(projectRoot, filePath);
  return absolute.startsWith(path.join(projectRoot, 'src') + path.sep);
}

async function transform(config, projectRoot, filePath, data, options) {
  if (isStylesheet(filePath) && !isProjectStylesheet(projectRoot, filePath)) {
    return expoWorker.transform(config, projectRoot, filePath, data, options);
  }

  /* Everything else — our CSS, and every JS/TS file in the project — goes to
     react-native-css, which passes non-CSS straight through to the same Expo
     worker. Its path is handed over by `metro.config.js` rather than resolved
     here: it is a package-internal file with no `exports` entry, so only the
     `withNativewind` result knows where it is. */
  const delegate = require(config.reactNativeCssTransformerPath);
  return delegate.transform(config, projectRoot, filePath, data, options);
}

module.exports = {
  transform,
  /* Metro keys its transform cache on this. Expo's own is correct for every
     file; the suffix invalidates the cache when the routing rule changes. */
  getCacheKey: (options) => `${expoWorker.getCacheKey(options)}-css-routing-1`,
};
