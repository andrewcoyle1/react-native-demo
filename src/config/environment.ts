/**
 * Which environment this bundle was built for.
 *
 * `EXPO_PUBLIC_APP_ENV` is inlined by Metro at bundle time — it is NOT read at
 * runtime. Changing environments means restarting the dev server (see the
 * `start:*` scripts in package.json), and `--clear` avoids a stale cached bundle.
 */
export type AppEnvironment = 'mock' | 'api' | 'dev' | 'prod';

const ENVIRONMENTS: readonly AppEnvironment[] = ['mock', 'api', 'dev', 'prod'];

function isAppEnvironment(value: string | undefined): value is AppEnvironment {
  return !!value && (ENVIRONMENTS as readonly string[]).includes(value);
}

function resolve(value: string | undefined): AppEnvironment {
  if (isAppEnvironment(value)) {
    return value;
  }
  // Fall back to the safest option rather than silently behaving as production.
  console.warn(
    `[environment] EXPO_PUBLIC_APP_ENV was ${value ? `"${value}"` : 'not set'}; falling back to "dev".`,
  );
  return 'dev';
}

export const environment = resolve(process.env.EXPO_PUBLIC_APP_ENV);

/** True when every dependency is an in-memory fake and nothing touches the network. */
export const isMock = environment === 'mock';

/** True when the app talks to the Node and Postgres service rather than Firebase. */
export const isApi = environment === 'api';

/**
 * Where the API lives.
 *
 * A simulator reaches the host as `localhost`; a physical device cannot, and
 * needs this machine's address on the network — hence the override rather than
 * a hardcoded value.
 */
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * The Mixpanel project token for this environment, or `null` to send nothing.
 *
 * `prod` and `dev` are separate Mixpanel projects so real numbers are never
 * contaminated by development traffic. `api` shares the `dev` project: it is a
 * development environment that happens to point at the custom backend, and it
 * disappears entirely once that backend replaces Firebase for `dev` and `prod`.
 *
 * Written as a literal `switch` on purpose. Metro inlines `EXPO_PUBLIC_*` by
 * substituting the exact source text, so a computed lookup
 * (`process.env[`EXPO_PUBLIC_MIXPANEL_${environment}`]`) is never substituted
 * and reads as `undefined` at runtime.
 */
export const mixpanelToken: string | null = (() => {
  switch (environment) {
    case 'prod':
      return process.env.EXPO_PUBLIC_MIXPANEL_TOKEN_PROD ?? null;
    case 'dev':
    case 'api':
      return process.env.EXPO_PUBLIC_MIXPANEL_TOKEN_DEV ?? null;
    case 'mock':
      return null;
  }
})();

/**
 * The Mixpanel ingestion host, which must match the project's data residency
 * region.
 *
 * This is not a nicety. A project created in the EU or India region silently
 * discards anything posted to the US host: the API answers `1` either way, the
 * SDK treats that as accepted and drops the batch, and the data simply never
 * appears. Mixpanel's ingestion does not validate tokens at all — an invented
 * token is answered `1` too — so a successful response proves only that the
 * request was well formed, never that it reached a project.
 *
 * Set `EXPO_PUBLIC_MIXPANEL_REGION` to `eu` or `in` to match the project;
 * anything else, including unset, stays on the US host.
 */
export const mixpanelServerUrl: string = (() => {
  switch (process.env.EXPO_PUBLIC_MIXPANEL_REGION) {
    case 'eu':
      return 'https://api-eu.mixpanel.com';
    case 'in':
      return 'https://api-in.mixpanel.com';
    default:
      return 'https://api.mixpanel.com';
  }
})();

export const flags = {
  /** Crash reports are only collected in production. */
  crashlyticsEnabled: environment === 'prod',
  /** Echo telemetry calls to the console so you can see them without sending them. */
  verboseLogging: environment !== 'prod',
} as const;
