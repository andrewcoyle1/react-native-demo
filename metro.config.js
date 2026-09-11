// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

/*
 * Keep the API server out of the bundler's way.
 *
 * `server/` is a separate Node project with its own node_modules living inside
 * this repository. Metro watches the project root by default, so without this
 * it would crawl those dependencies — slowing every rebuild, and able to
 * resolve a server-only package into the app bundle.
 *
 * Anchored to this exact directory rather than matching `/server/` anywhere:
 * `expo-router/build/server` and `@expo/cli/.../start/server` both live inside
 * node_modules, and blocking those breaks native module registration.
 */
const serverDir = path.resolve(__dirname, 'server');
const escaped = serverDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp(`^${escaped}${path.sep === '\\' ? '\\\\' : '/'}`)];

/*
 * NativeWind v5, which is what the alternate UI behind the "Alternate UI"
 * switch is built on. There is no `input` option in v5 — react-native-css
 * compiles whichever `.css` file the app imports, and `app/_layout.tsx`
 * imports `src/global.css` at the root.
 *
 * Wrapped over the blockList above rather than replacing it: it spreads the
 * existing `resolver`, and only adds `resolveRequest` and the `css` source
 * extension.
 */
const nativewindConfig = withNativewind(config, {
  /*
   * OFF, deliberately, and the app does not boot with it on.
   *
   * The flag is `withNativewind`'s default. It makes every React Native
   * primitive accept `className` by rewriting the resolution of the
   * `react-native` module itself — but the rewrite is applied to every module
   * in the graph except `react-native/index.js`, which means React Native's
   * *own internals* get rewritten too. Measured on this project: 84 files
   * under `react-native/Libraries` had their imports swapped for the
   * react-native-css shims, `Pressable.js`, `ScrollView.js`, `TextInput.js`,
   * `AnimatedView.js` and LogBox among them. Each shim imports back out of
   * `react-native`, so RN's bootstrap ends up with cycles through a
   * third-party module and throws before the runtime is ready.
   *
   * It bundles perfectly cleanly either way, so nothing catches this short of
   * launching the app.
   */
  globalClassNamePolyfill: false,
});

/*
 * The polyfill, narrowed to the only two directories that want it.
 *
 * `components/ui` is the vendored gluestack library and `components/alt` is
 * the alternate UI built on it; both style React Native primitives with
 * `className` and neither works without the swap. Nothing else in the app uses
 * a class name, so scoping by the importing file gives those two exactly what
 * the global flag would have given them and leaves React Native, every other
 * dependency and every existing screen resolving normally.
 *
 * This is also what the experiment wanted in the first place: with the global
 * flag there was no way to keep the pilot off the rest of the app.
 */
const scoped = [
  path.resolve(__dirname, 'src', 'components', 'ui') + path.sep,
  path.resolve(__dirname, 'src', 'components', 'alt') + path.sep,
];

/* react-native-css installs its own `resolveRequest`, and its setup check
   throws if a later one replaces it without delegating. This one delegates. */
const parentResolveRequest = nativewindConfig.resolver.resolveRequest;

nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath ?? '';

  if (moduleName === 'react-native' && scoped.some(dir => origin.startsWith(dir))) {
    return parentResolveRequest(context, 'react-native-css/components', platform);
  }

  return parentResolveRequest(context, moduleName, platform);
};

/*
 * Keep react-native-css off other packages' stylesheets.
 *
 * It makes itself the transformer for the entire project and compiles every
 * `.css` in the graph. `@expo/log-box` ships one, `expo-router/entry` loads
 * LogBox first thing, and compiling it drags react-native-css's runtime up
 * ahead of React Native's own initialisation — which crashes the dev client on
 * launch. `metro-css-transformer.js` explains the chain in full.
 *
 * The wrapper keeps react-native-css for this project's CSS and hands anything
 * under node_modules back to Expo. Its own transformer is passed along by path
 * because it has no `exports` entry to resolve by name.
 */
nativewindConfig.transformer.reactNativeCssTransformerPath =
  nativewindConfig.transformerPath;
nativewindConfig.transformerPath = require.resolve('./metro-css-transformer.js');

module.exports = nativewindConfig;
