/**
 * The planned half of the workout detail sheet.
 *
 * Extends `session-presenter.ts` rather than repeating it: the sheet's header,
 * chips and metric grid are the same transformations the dashboard card already
 * uses, and the only thing the sheet adds is depth — the set bands over the
 * chart, the workout written out step by step, and where it can be sent.
 *
 * Pure. Every function here takes domain values and returns component props,
 * which is what lets the whole planned tab be tested without a renderer.
 */
import type { SFSymbol } from 'expo-symbols';

import { toSessionMetrics } from './session-presenter';

import type { ConnectionRowProps } from '@/components/connection-row';
import type { IntervalBand } from '@/components/interval-chart';
import type { WorkoutMetric } from '@/components/metric-grid';
import type { StepProps, StepRestProps, WorkoutSetProps } from '@/components/workout-steps';
import { Accents, Zones } from '@/constants/theme';
import { formatDistance, formatDuration } from '@/domain/format';
import type { SetKind, UnitSystem } from '@/domain/training';
import type {
  SessionConnection,
  SessionModel,
  StepRest,
  WorkoutStep,
} from '@/providers/sessions-provider';

/**
 * How each set reads — its short chart label, its long list label, and the
 * colour that ties the two together.
 *
 * One table rather than three: a set's band and its heading must never disagree
 * about which colour it is, and they cannot if they are read from the same row.
 */
const SetStyle: Record<SetKind, { short: string; long: string; accent: string }> = {
  warmup: { short: 'WU', long: 'Warmup set', accent: Zones.swim },
  drill: { short: 'DRL', long: 'Drill set', accent: Accents.equipment },
  main: { short: 'MAIN', long: 'Main set', accent: Accents.schedule },
  skill: { short: 'SKL', long: 'Skill set', accent: Accents.endurance },
  speed: { short: 'SPD', long: 'Speed set', accent: Accents.speed },
  warmdown: { short: 'WD', long: 'Warmdown set', accent: Zones.swim },
};

/** The intensity tile's glyph and colour, which rise together with the effort. */
const IntensityStyle = {
  low: { icon: 'chart.bar.fill', accent: Accents.endurance, label: 'Low' },
  moderate: { icon: 'chart.bar.fill', accent: Accents.equipment, label: 'Moderate' },
  high: { icon: 'chart.bar.fill', accent: Accents.speed, label: 'High' },
} as const satisfies Record<string, { icon: SFSymbol; accent: string; label: string }>;

/**
 * The metric grid, with intensity appended.
 *
 * Intensity is not one of `targets` — it is a verdict on the session rather
 * than a figure to hit — so it is added here rather than inside
 * `toSessionMetrics`, which the dashboard card shares and which has no room
 * for a fifth tile.
 */
export function toDetailMetrics(session: SessionModel, units: UnitSystem): WorkoutMetric[] {
  const metrics = toSessionMetrics(session, units);

  if (session.intensity) {
    const style = IntensityStyle[session.intensity];
    metrics.push({
      label: 'Intensity',
      value: style.label,
      icon: style.icon,
      accent: style.accent,
    });
  }

  return metrics;
}

/** The footnote under the grid, or null when nothing was estimated. */
export function toEstimateFootnote(session: SessionModel): string | null {
  return session.estimateBasis ? `*Based on ${session.estimateBasis}` : null;
}

export function toChartBands(session: SessionModel): IntervalBand[] {
  return session.bands.map(band => ({
    label: SetStyle[band.kind].short,
    startMinute: band.startSeconds / 60,
    durationMinutes: band.durationSeconds / 60,
    color: SetStyle[band.kind].accent,
  }));
}

/** "10s rest", "2:30 rest", or the athlete's own call. */
function toRest(rest: StepRest | null): StepRestProps | null {
  if (!rest) {
    return null;
  }
  if (rest.open || rest.seconds === null) {
    return { label: 'Open rest', open: true };
  }
  // Under a minute reads as plain seconds; above it, as a clock. "90s rest" is
  // how a coach says it, "1:30 rest" is how they say the longer ones.
  const label = rest.seconds < 60 ? `${rest.seconds}s` : formatDuration(rest.seconds);
  return { label: `${label} rest`, open: false };
}

/**
 * How much a step asks for — a distance, a time, or neither.
 *
 * A step is written as one or the other, never both: "50m Freestyle" and "15s
 * Ball Float" are the two forms, and a step with no quantity at all is a
 * composite whose parts carry them.
 */
function toQuantity(step: Extract<WorkoutStep, { kind: 'effort' }>, units: UnitSystem): string {
  if (step.distanceMetres !== null) {
    const distance = formatDistance(step.distanceMetres, units, 'swim');
    return `${distance.value}${distance.unit}`;
  }
  if (step.durationSeconds !== null) {
    return step.durationSeconds < 60
      ? `${step.durationSeconds}s`
      : `${Math.round(step.durationSeconds / 60)} mins`;
  }
  return '';
}

/**
 * One step into component props, recursively.
 *
 * `path` makes the key: two 50m freestyle steps inside the same repeat are
 * genuinely identical, so nothing in the step itself can tell them apart.
 */
function toStep(step: WorkoutStep, units: UnitSystem, path: string): StepProps {
  if (step.kind === 'repeat') {
    return {
      kind: 'repeat',
      id: path,
      label: `Repeat ${step.times}x`,
      children: step.children.map((child, index) => toStep(child, units, `${path}.${index}`)),
      rest: toRest(step.rest),
    };
  }

  return {
    kind: 'effort',
    id: path,
    quantity: toQuantity(step, units),
    name: step.name,
    zone: step.zone ? step.zone.toUpperCase() : null,
    equipment: step.equipment,
    hasVideo: step.hasVideo,
    note: step.note,
    rest: toRest(step.rest),
    parts: step.parts.map((part, index) => toStep(part, units, `${path}p${index}`)),
  };
}

export function toWorkoutSets(session: SessionModel, units: UnitSystem): WorkoutSetProps[] {
  return session.sets.map(set => ({
    id: set.id,
    label: set.title ?? SetStyle[set.kind].long,
    accent: SetStyle[set.kind].accent,
    steps: set.steps.map((step, index) => toStep(step, units, `${set.id}.${index}`)),
  }));
}

/** "Sep 13 at 5:04 PM" — how the design dates a sync. */
function formatSyncedAt(date: Date): string {
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
}

export function toConnectionRows(connections: SessionConnection[]): ConnectionRowProps[] {
  return connections.map(connection =>
    connection.kind === 'garmin'
      ? {
          title: 'Resync to Garmin',
          subtitle: connection.syncedAt
            ? `Synced on ${formatSyncedAt(connection.syncedAt)}`
            : 'Not sent to your watch yet',
          icon: 'arrow.triangle.2.circlepath' as SFSymbol,
          accent: Accents.info,
        }
      : {
          title: 'Download for indoor training apps',
          subtitle: '.zwo file for Zwift, MyWhoosh, Rouvy, etc.',
          icon: 'arrow.down.circle' as SFSymbol,
          accent: Accents.recovery,
        },
  );
}

/** "MON, SEP 14" — the date line above the title. */
export function toSessionDateLine(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return date
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
}
