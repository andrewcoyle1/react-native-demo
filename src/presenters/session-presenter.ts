/**
 * Turns a `SessionModel` into `WorkoutCard`'s props.
 *
 * This is the only place a session acquires an icon, a colour or a formatted
 * number, which is what lets the service below it stay presentation-free. The
 * card itself is unchanged — the props it takes are the props it always took.
 */
import type { ChipProps } from '@/components/chip';
import type { IntervalSegment } from '@/components/interval-chart';
import type { WorkoutMetric } from '@/components/workout-card';
import { Disciplines, Purposes, ZoneColors, equipmentChip, focusChip } from '@/constants/disciplines';
import { Accents } from '@/constants/theme';
import {
  formatDistance,
  formatDurationParts,
  formatLoad,
  formatSpeed,
} from '@/domain/format';
import type { Discipline, UnitSystem } from '@/domain/training';
import type { SessionModel } from '@/providers/sessions-provider';

/** Metric tiles keep one icon and colour per quantity across every session. */
const MetricStyle = {
  time: { icon: 'clock', accent: Accents.recovery },
  distance: { icon: 'ruler', accent: Accents.equipment },
  speed: { icon: 'speedometer', accent: Accents.speed },
  load: { icon: 'chart.dots.scatter', accent: Accents.commitment },
} as const;

/**
 * Which of a session's figures are prescribed and which are derived.
 *
 * A swim is written as a set, so its distance is exact and the time it will take
 * is an estimate. A run or ride is written as a duration, so the clock is exact
 * and the ground covered is the estimate. The asterisk in the design marks the
 * derived one, and this is the rule behind it.
 */
function isEstimated(discipline: Discipline, quantity: 'time' | 'distance'): boolean {
  return discipline === 'swim' ? quantity === 'time' : quantity === 'distance';
}

/** `'Est. dist*'` or `'Distance'`, by that rule. */
function label(base: string, estimatedBase: string, estimated: boolean): string {
  return estimated ? `${estimatedBase}*` : base;
}

export function toSessionTags(session: SessionModel): ChipProps[] {
  return [
    ...(session.purpose ? [Purposes[session.purpose]] : []),
    // Neutral, so it does not compete with the coloured purpose chip beside it.
    ...(session.descriptor ? [{ label: session.descriptor }] : []),
    ...session.focus.map(focusChip),
    ...session.equipment.map(equipmentChip),
  ];
}

export function toSessionMetrics(session: SessionModel, units: UnitSystem): WorkoutMetric[] {
  const { targets, discipline } = session;
  const metrics: WorkoutMetric[] = [];
  const estimated = targets.estimated ?? false;

  if (targets.durationSeconds !== undefined) {
    const time = formatDurationParts(targets.durationSeconds);
    metrics.push({
      ...MetricStyle.time,
      label: label('Time', 'Est. time', estimated && isEstimated(discipline, 'time')),
      value: time.value,
      unit: time.unit,
      extra: time.extra,
    });
  }

  if (targets.distanceMetres !== undefined) {
    const distance = formatDistance(targets.distanceMetres, units, discipline);
    metrics.push({
      ...MetricStyle.distance,
      label: label('Distance', 'Est. dist', estimated && isEstimated(discipline, 'distance')),
      value: distance.value,
      unit: distance.unit,
    });
  }

  if (targets.paceSecondsPerKm !== undefined) {
    const speed = formatSpeed(targets.paceSecondsPerKm, units, discipline);
    metrics.push({
      ...MetricStyle.speed,
      // Cyclists read distance per time and everyone else time per distance, so
      // even the word changes with the discipline.
      label: label(
        discipline === 'ride' ? 'Speed' : 'Pace',
        discipline === 'ride' ? 'Est. speed' : 'Est. pace',
        estimated,
      ),
      value: speed.value,
      unit: speed.unit,
    });
  }

  if (targets.load !== undefined) {
    const load = formatLoad(targets.load);
    metrics.push({ ...MetricStyle.load, label: 'Load', value: load.value, unit: load.unit });
  }

  return metrics;
}

export function toSessionSegments(session: SessionModel): IntervalSegment[] {
  return session.segments.map(segment => ({
    startMinute: segment.startSeconds / 60,
    durationMinutes: segment.durationSeconds / 60,
    intensity: segment.intensity,
    color: ZoneColors[segment.zone],
    striped: segment.drill,
  }));
}

/** Everything `WorkoutCard` needs, bar the handlers the screen supplies. */
export function toWorkoutCardProps(session: SessionModel, units: UnitSystem) {
  const discipline = Disciplines[session.discipline];
  const metrics = toSessionMetrics(session, units);
  const segments = toSessionSegments(session);

  return {
    title: session.title,
    icon: discipline.icon,
    iconAccent: discipline.accent,
    status: session.completion ? 'Completed' : undefined,
    tags: toSessionTags(session),
    // Undefined rather than empty, so the card's own guards drop the blocks
    // entirely for a bare commitment.
    metrics: metrics.length > 0 ? metrics : undefined,
    segments: segments.length > 0 ? segments : undefined,
    totalMinutes: session.chartSeconds !== null ? session.chartSeconds / 60 : undefined,
    tickEvery: session.tickEveryMinutes ?? undefined,
    coach: session.coachName ?? undefined,
    note: session.coachNote ?? undefined,
  };
}
