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

export const flags = {
  /** Analytics events are only collected in production. */
  analyticsEnabled: environment === 'prod',
  /** Crash reports are only collected in production. */
  crashlyticsEnabled: environment === 'prod',
  /** Echo telemetry calls to the console so you can see them without sending them. */
  verboseLogging: environment !== 'prod',
} as const;
