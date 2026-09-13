/*
 * Tailwind v4's compiler, which is what turns the `@import "tailwindcss/…"`
 * lines in `src/global.css` into actual utility classes.
 *
 * Required for native, not just web, and not obviously so: react-native-css's
 * Metro transformer runs every `.css` file through Expo's *web* CSS pipeline
 * first — which is where this config is picked up — and only then compiles the
 * resulting plain CSS into a native stylesheet. Without this file, `bg-card`
 * and friends are never generated on any platform.
 *
 * CommonJS rather than the `export default` shown in most v4 guides: this
 * package has no `"type": "module"`.
 */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
