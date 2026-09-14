/**
 * Prettier, configured to match what this codebase already does.
 *
 * Every value below was measured against the tracked source rather than
 * chosen, so adopting the formatter is close to a no-op on existing files and
 * the diffs it produces stay about the code. The counts are from
 * `src/**` and `server/src/**`, excluding the vendored gluestack components.
 *
 * Anything Prettier already defaults to correctly — two-space indent,
 * semicolons, `trailingComma: "all"`, double-quoted JSX attributes — is left
 * out. A config that restates defaults reads as though they were decisions.
 */

/** @type {import("prettier").Config} */
export default {
  /*
   * 100, not the default 80.
   *
   * The 99th percentile line here is 95 characters, and the count of lines
   * over each width falls away sharply past 100 (161 lines over 100, 88 over
   * 110). At 80 the formatter would rewrap a large part of the codebase to no
   * one's benefit.
   */
  printWidth: 100,

  /* 1248 single-quoted imports against 4 double-quoted. */
  singleQuote: true,

  /*
   * `tag =>` rather than `(tag) =>`: 119 occurrences against 1.
   *
   * This is the one that made a stray `npx prettier --write` obvious — the
   * default is "always", so it added parentheses to every single-argument
   * arrow in the file.
   */
  arrowParens: 'avoid',

  /*
   * A multi-line JSX element closes its opening tag on the last attribute's
   * line — `className="px-3 py-3">` — rather than putting the `>` on a line of
   * its own: 75 occurrences against 0. The default is the opposite.
   */
  bracketSameLine: true,
};
