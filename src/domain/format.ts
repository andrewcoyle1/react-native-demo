/**
 * Formatters shared by the presenters.
 *
 * The sample data these replace stored `"1:47"` and `"2700"` as strings, which
 * meant the unit system was decided when the fixture was typed. Here the domain
 * keeps SI numbers — metres, seconds — and the athlete's preference is a
 * parameter, so switching a profile to imperial changes every screen at once.
 *
 * Split into a value and a unit throughout, because the cards render the two at
 * different sizes: `WorkoutMetric` and the activity row both take them apart.
 */
import type { Discipline, UnitSystem } from './training.ts';

/** A number and its unit, as the cards want them. */
export type Measure = { value: string; unit: string };

const MetresPerMile = 1609.344;
const MetresPerYard = 0.9144;

/** `3663` -> `'1:01:03'`; under an hour, `'33:03'`. */
export function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = whole % 60;

  const pad = (value: number) => `${value}`.padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(remainder)}` : `${minutes}:${pad(remainder)}`;
}

/**
 * A duration as the big/small pair the dashboard's metric tiles use:
 * `4080` -> `{ value: '1', unit: 'hr', extra: { value: '8', unit: 'min' } }`.
 */
export function formatDurationParts(seconds: number): Measure & { extra?: Measure } {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return { value: `${minutes}`, unit: 'min' };
  }

  // The minutes are dropped entirely at a round hour, rather than shown as
  // "0 min", which is how the design's "2 hr" cards read.
  return {
    value: `${hours}`,
    unit: 'hr',
    ...(minutes > 0 ? { extra: { value: `${minutes}`, unit: 'min' } } : {}),
  };
}

/**
 * `'90.0'` -> `'90'`, leaving `'21.1'` alone.
 *
 * Applied to fixed quantities like a race leg, never to a measured one: an
 * activity's distance reads as "19.0 km" because the decimal is a claim about
 * precision, while a race's bike leg is simply 90 km.
 */
export function trimDecimal(measure: Measure): Measure {
  return measure.value.endsWith('.0')
    ? { ...measure, value: measure.value.slice(0, -2) }
    : measure;
}

/**
 * Distance in the athlete's units.
 *
 * Pass `discipline` for a *pool set*, where swimming is the exception every
 * triathlon app has to make: a set is quoted in metres or yards however long it
 * is, never converted to miles. Leave it off for open-water and race distances,
 * which are quoted like any other — a 70.3's swim leg is "1.9 km", not
 * "1900 m".
 */
export function formatDistance(
  metres: number,
  units: UnitSystem,
  discipline?: Discipline,
): Measure {
  if (discipline === 'swim') {
    return units === 'imperial'
      ? { value: `${Math.round(metres / MetresPerYard)}`, unit: 'yd' }
      : { value: `${Math.round(metres)}`, unit: 'm' };
  }

  if (units === 'imperial') {
    return { value: (metres / MetresPerMile).toFixed(1), unit: 'mi' };
  }

  return { value: (metres / 1000).toFixed(1), unit: 'km' };
}

/** `325` -> `'5:25'`. Pace is minutes and seconds, never decimal minutes. */
export function formatPace(secondsPerUnit: number): string {
  const whole = Math.round(secondsPerUnit);
  return `${Math.floor(whole / 60)}:${`${whole % 60}`.padStart(2, '0')}`;
}

/**
 * Pace or speed, whichever the discipline is read in.
 *
 * Runners and swimmers think in time per distance; cyclists think in distance
 * per time. Both come from the same `secondsPerKm`, so the domain stores one
 * number and this decides how to say it.
 */
export function formatSpeed(
  secondsPerKm: number,
  units: UnitSystem,
  discipline: Discipline,
): Measure {
  if (discipline === 'ride') {
    const kmPerHour = 3600 / secondsPerKm;
    return units === 'imperial'
      ? { value: ((kmPerHour * 1000) / MetresPerMile).toFixed(1), unit: 'mph' }
      : { value: kmPerHour.toFixed(1), unit: 'km/h' };
  }

  if (discipline === 'swim') {
    // Per 100 m — or per 100 yd, which is the same figure scaled.
    const per100 = units === 'imperial' ? (secondsPerKm / 10) * MetresPerYard : secondsPerKm / 10;
    return { value: formatPace(per100), unit: units === 'imperial' ? '/100yd' : '/100m' };
  }

  return units === 'imperial'
    ? { value: formatPace((secondsPerKm * MetresPerMile) / 1000), unit: '/mi' }
    : { value: formatPace(secondsPerKm), unit: '/km' };
}

/** `6.23` -> `'6.2'`. Training load is always one decimal out of ten. */
export function formatLoad(load: number): Measure {
  return { value: load.toFixed(1), unit: '/10' };
}

/** `'1 hr 57 min'`, `'58 min'` — a duration spelled out rather than punctuated. */
export function formatDurationWords(seconds: number): string {
  const parts = formatDurationParts(seconds);
  return parts.extra
    ? `${parts.value} ${parts.unit} ${parts.extra.value} ${parts.extra.unit}`
    : `${parts.value} ${parts.unit}`;
}

/** `'305 days'`, `'1 day'`, `'today'` — the plan card's countdown. */
export function formatDayCount(days: number): string {
  if (days === 0) {
    return 'today';
  }
  return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
}
