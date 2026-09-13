// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    /*
     * `src/components/ui` is vendored, not written here: gluestack-ui v5 copies
     * its components into the project rather than shipping them as a
     * dependency, and `npx gluestack-ui add <component>` overwrites them. They
     * are kept byte-close to upstream so that stays a clean diff, which means
     * their house style — duplicate imports from the same module, mostly — is
     * not ours to correct. Linting them only produces warnings nobody can act
     * on without making the next update a merge.
     */
    ignores: ["dist/*", "server/*", "src/components/ui/*"],
  }
]);
