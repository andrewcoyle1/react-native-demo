/**
 * Stands in for the app's stylesheet under Jest.
 *
 * `constants/theme.ts` imports `global.css` because that import is what starts
 * the NativeWind pipeline in a real bundle. Jest has no CSS transformer, so it
 * reads the file as JavaScript and dies on the first selector. Nothing under
 * test renders NativeWind classes, so an empty module is the whole fix.
 */
module.exports = {};
