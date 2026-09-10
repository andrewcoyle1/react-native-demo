/**
 * The vocabulary the training slices share.
 *
 * Disciplines, effort zones and session purposes are not owned by any one
 * service — a session is planned in them and an activity is recorded in them —
 * so they sit above the seam rather than inside `sessions-service.ts`, which
 * would make `activities-service.ts` depend on a sibling slice.
 *
 * Every union is paired with a `readonly` array of its members, because a
 * Firestore converter needs the runtime list to validate a field against
 * (`readEnum(data.discipline, DISCIPLINES)`). The union is derived from the
 * array so the two can never drift.
 */

/** The sports the app plans and records. */
export const DISCIPLINES = ['swim', 'run', 'ride', 'weights'] as const;
export type Discipline = (typeof DISCIPLINES)[number];

/**
 * What a session is *for*. Distinct from its zones: an endurance ride and an
 * endurance run share a purpose but no colour.
 */
export const PURPOSES = ['recovery', 'endurance', 'speed', 'commitment'] as const;
export type Purpose = (typeof PURPOSES)[number];

/** Effort bands on the session chart. */
export const ZONES = ['warmup', 'easy', 'hard', 'swim', 'ride', 'sprint', 'drill'] as const;
export type Zone = (typeof ZONES)[number];

/** How an activity reached the app — the small marks on an activity row. */
export const ACTIVITY_SOURCES = ['linked', 'uploaded', 'effort'] as const;
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

/** The athlete's measurement preference, from their profile. */
export const UNIT_SYSTEMS = ['metric', 'imperial'] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

/**
 * A calendar day as `'YYYY-MM-DD'`.
 *
 * Sessions are keyed by day rather than by instant on purpose: a session belongs
 * to a date in the athlete's own timezone, so a flight must not move Tuesday's
 * long run onto Monday. It also makes the week window an ordinary string range
 * query, which needs no composite index.
 */
export type DateKey = string;

/** An inclusive span of days. What a windowed session read is scoped to. */
export type DateRange = { from: DateKey; to: DateKey };

/** Local-time `'YYYY-MM-DD'`. Never `toISOString`, which converts to UTC. */
export function toDateKey(date: Date): DateKey {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The local midnight a date key names. */
export function fromDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** `dateKey` shifted by whole days, staying in local time. */
export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: DateKey, to: DateKey): number {
  const millis = fromDateKey(to).getTime() - fromDateKey(from).getTime();
  // Rounded rather than floored: a DST change makes one of these days 23 or 25
  // hours long, which would otherwise lose or gain a day across the boundary.
  return Math.round(millis / 86_400_000);
}
