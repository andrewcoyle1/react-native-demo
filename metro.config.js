// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
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

module.exports = config;
