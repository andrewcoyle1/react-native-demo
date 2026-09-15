/**
 * The completed half of the workout detail sheet.
 *
 * What the athlete actually did: the recorded figures, the laps, and the three
 * streams the design charts. Pure, like every presenter here — it takes an
 * `ActivityModel` and returns component props, and knows nothing about how the
 * activity was fetched.
 *
 * The one judgement worth naming is the axis scales. Each chart picks its own
 * bounds from its own data rather than from a fixed range, because a recovery
 * run and an interval session share no sensible heart-rate axis — but the
 * bounds are padded and rounded so the line never touches the frame and the
 * labels are numbers a person would choose.
 */
import type { SFSymbol } from 'expo-symbols';

import type { LapBar } from '@/components/laps-chart';
import type { WorkoutMetric } from '@/components/metric-grid';
import type { StreamPoint } from '@/components/stream-chart';
import { Accents, Zones } from '@/constants/theme';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '@/domain/format';
import type { Discipline, UnitSystem } from '@/domain/training';
import type { ActivityModel, LapModel, StreamSample } from '@/providers/activities-provider';

/** One icon and colour per quantity, held across every chart and tile. */
const StatStyle = {
  time: { icon: 'clock', accent: Accents.recovery },
  distance: { icon: 'ruler', accent: Accents.equipment },
  pace: { icon: 'speedometer', accent: Accents.speed },
  heartRate: { icon: 'heart.fill', accent: Accents.speed },
  elevation: { icon: 'mountain.2.fill', accent: Accents.schedule },
  cadence: { icon: 'shoeprints.fill', accent: Accents.equipment },
  calories: { icon: 'flame.fill', accent: Zones.hard },
} as const satisfies Record<string, { icon: SFSymbol; accent: string }>;

/** The recorded figures, in the order the design reads them. */
export function toActivityMetrics(activity: ActivityModel, units: UnitSystem): WorkoutMetric[] {
  const { stats, discipline } = activity;
  const metrics: WorkoutMetric[] = [];

  if (stats.durationSeconds !== undefined) {
    metrics.push({
      ...StatStyle.time,
      label: 'Time',
      // The exact clock, not the rounded "35 min" the plan asked for: this is
      // what happened, and the seconds are part of what happened.
      value: formatDuration(stats.durationSeconds),
    });
  }

  if (stats.distanceMetres !== undefined) {
    const distance = formatDistance(stats.distanceMetres, units, discipline);
    metrics.push({ ...StatStyle.distance, label: 'Distance', ...distance });
  }

  if (stats.paceSecondsPerKm !== undefined) {
    const speed = formatSpeed(stats.paceSecondsPerKm, units, discipline);
    metrics.push({
      ...StatStyle.pace,
      label: discipline === 'ride' ? 'Avg. speed' : 'Avg. pace',
      ...speed,
    });
  }

  if (stats.averageHeartRate !== undefined) {
    metrics.push({
      ...StatStyle.heartRate,
      label: 'Avg. HR',
      value: `${stats.averageHeartRate}`,
      unit: 'bpm',
    });
  }

  if (stats.elevationMetres !== undefined) {
    metrics.push({
      ...StatStyle.elevation,
      label: 'Elevation',
      value: `${Math.round(stats.elevationMetres)}`,
      unit: 'm',
    });
  }

  if (stats.averageCadence !== undefined) {
    metrics.push({
      ...StatStyle.cadence,
      label: 'Avg. cadence',
      value: `${stats.averageCadence}`,
      unit: discipline === 'ride' ? 'rpm' : 'spm',
    });
  }

  if (stats.calories !== undefined) {
    metrics.push({
      ...StatStyle.calories,
      label: 'Calories',
      value: `${stats.calories}`,
      unit: 'kcal',
    });
  }

  return metrics;
}

export function toLapBars(laps: LapModel[]): LapBar[] {
  const longest = Math.max(...laps.map(lap => lap.distanceMetres), 1);

  return laps.map(lap => ({
    id: `${lap.index}`,
    paceSecondsPerKm: lap.paceSecondsPerKm,
    // Relative to the longest lap, so a 115m stride is visibly a fraction of a
    // kilometre rather than a column of equal width.
    widthFraction: lap.distanceMetres / longest,
  }));
}

/** Evenly spaced pace labels between the fastest and slowest lap. */
export function toLapAxis(laps: LapModel[], steps = 6): string[] {
  const paces = laps.map(lap => lap.paceSecondsPerKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const step = (slowest - fastest) / Math.max(steps - 1, 1);

  // Fastest first: the axis reads downward into slower paces, which is the
  // direction the bars shrink in.
  return Array.from({ length: steps }, (_, index) => formatPace(fastest + index * step));
}

export type StreamKind = 'pace' | 'heartRate' | 'cadence';

export type StreamChartModel = {
  kind: StreamKind;
  title: string;
  icon: SFSymbol;
  color: string;
  /** "Avg Pace 5:04/km" — the pill in the card's header. */
  badge: string;
  points: StreamPoint[];
  yLabels: string[];
  xLabels: string[];
  min: number;
  max: number;
  average: number;
  /** True for pace, where a smaller number belongs at the top of the plot. */
  invert: boolean;
};

/** Pads a range by a tenth so the line never runs along the frame. */
function padded(values: number[]): { min: number; max: number } {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const margin = Math.max((high - low) * 0.1, 1);
  return { min: low - margin, max: high + margin };
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** '1km', '2km' … one label per whole unit covered. */
function distanceLabels(totalMetres: number, units: UnitSystem): string[] {
  const perUnit = units === 'imperial' ? 1609.344 : 1000;
  const suffix = units === 'imperial' ? 'mi' : 'km';
  const whole = Math.floor(totalMetres / perUnit);

  return Array.from({ length: whole }, (_, index) => `${index + 1}${suffix}`);
}

/**
 * The three streams, in the order the design stacks them.
 *
 * A stream with no samples is dropped rather than charted empty: a swim has no
 * cadence, and an empty axis would read as a recording failure.
 */
export function toStreamCharts(
  activity: ActivityModel,
  units: UnitSystem,
  discipline: Discipline,
): StreamChartModel[] {
  const totalMetres = activity.stats.distanceMetres ?? 0;
  const xLabels = distanceLabels(totalMetres, units);

  const build = (
    kind: StreamKind,
    read: (sample: StreamSample) => number | undefined,
  ): StreamChartModel | null => {
    const points = activity.samples
      .map(sample => ({ atMetres: sample.atMetres, value: read(sample) }))
      .filter((point): point is StreamPoint => point.value !== undefined);

    if (points.length < 2) {
      return null;
    }

    const values = points.map(point => point.value);
    const bounds = padded(values);
    const mean = average(values);

    const shared = { points, xLabels, ...bounds, average: mean };

    if (kind === 'pace') {
      const speed = formatSpeed(mean, units, discipline);
      return {
        ...shared,
        kind,
        title: discipline === 'ride' ? 'Speed' : 'Pace',
        icon: StatStyle.pace.icon,
        color: Accents.interval,
        badge: `Avg ${discipline === 'ride' ? 'Speed' : 'Pace'} ${speed.value}${speed.unit}`,
        yLabels: axisLabels(bounds, value => formatPace(value)),
        invert: true,
      };
    }

    if (kind === 'heartRate') {
      return {
        ...shared,
        kind,
        title: 'Heart rate',
        icon: StatStyle.heartRate.icon,
        color: Accents.speed,
        badge: `Avg HR ${Math.round(mean)}bpm`,
        yLabels: axisLabels(bounds, value => `${Math.round(value)}`),
        invert: false,
      };
    }

    return {
      ...shared,
      kind,
      title: 'Cadence',
      icon: StatStyle.cadence.icon,
      color: Accents.equipment,
      badge: `Avg Cadence ${Math.round(mean)}${discipline === 'ride' ? 'rpm' : 'spm'}`,
      yLabels: axisLabels(bounds, value => `${Math.round(value)}`),
      invert: false,
    };
  };

  return [
    build('pace', sample => sample.paceSecondsPerKm),
    build('heartRate', sample => sample.heartRate),
    build('cadence', sample => sample.cadence),
  ].filter((chart): chart is StreamChartModel => chart !== null);
}

/** Five labels down the axis, highest first. */
function axisLabels(
  bounds: { min: number; max: number },
  format: (value: number) => string,
  steps = 5,
): string[] {
  const step = (bounds.max - bounds.min) / Math.max(steps - 1, 1);
  return Array.from({ length: steps }, (_, index) => format(bounds.max - index * step));
}

/** "Workout review: RPE 5/10", or null when the athlete has not rated it. */
export function toReviewLabel(activity: ActivityModel): string | null {
  return activity.review ? `Workout review: RPE ${activity.review.rpe}/10` : null;
}
