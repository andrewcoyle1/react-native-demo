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
  jwtSecret: required('JWT_SECRET'),
  isProduction: process.env.NODE_ENV === 'production',
} as const;
