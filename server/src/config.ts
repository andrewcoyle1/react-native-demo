/**
 * Environment, parsed once and validated at startup.
 *
 * Reading `process.env` at the point of use spreads the failure out: a missing
 * secret becomes a confusing error on the first request that needs it, hours
 * after the process started. Here it is a refusal to boot, with the name of the
 * variable that is missing.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy server/.env.example to server/.env.`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(optional('PORT', '4000')),

  /*
   * Which interface to listen on.
   *
   * `0.0.0.0` by default so a simulator or a device on the LAN can reach a
   * development server. Behind a reverse proxy set it to `127.0.0.1`: the proxy
   * is then the only way in, and a firewall rule is no longer the single thing
   * standing between the port and the internet.
   */
  host: optional('HOST', '0.0.0.0'),
  jwtSecret: required('JWT_SECRET'),
  isProduction: process.env.NODE_ENV === 'production',

  /*
   * Trust `X-Forwarded-For` when something in front of us sets it.
   *
   * Off by default and deliberately so: with it on and no proxy, a client can
   * forge the header and every rate limit becomes trivially evadable. Turn it
   * on only once a load balancer is actually in front, or `request.ip` is the
   * proxy's address and every user shares one budget.
   */
  trustProxy: optional('TRUST_PROXY', 'false') === 'true',

  rateLimit: {
    /** Requests per window for ordinary endpoints, per IP. */
    max: Number(optional('RATE_LIMIT_MAX', '300')),
    /** Requests per window for the auth endpoints, which are the ones guessed at. */
    authMax: Number(optional('RATE_LIMIT_AUTH_MAX', '10')),
    windowMs: Number(optional('RATE_LIMIT_WINDOW_MS', '60000')),
  },
} as const;
