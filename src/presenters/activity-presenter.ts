/**
 * Turns an `ActivityModel` into the Activities row's props, and groups a page of
 * them into the weekly sections the list renders.
 *
 * The grouping lives here rather than in the screen because it is the same
 * arithmetic wherever activities are shown, and because the week boundary is a
 * domain question — a training week starts on Monday, not on the locale's first
 * day.
 */
import type { SFSymbol } from 'expo-symbols';

import { Disciplines } from '@/constants/disciplines';
import { Accents, Zones } from '@/constants/theme';
import { formatDistance, formatDuration, formatSpeed } from '@/domain/format';
import type { ActivitySource, UnitSystem } from '@/domain/training';
import type { ActivityModel } from '@/providers/activities-provider';

export type ActivityStat = {
  icon: SFSymbol;
  /**
   * What the figure is, in a word.
   *
   * The standard row labels its figures with the symbol alone, and does not
   * read this. The gluestack build sets its numbers value-over-label — the
   * treatment the Dashboard already gives a session's figures — and a label is
   * part of what a figure *is* rather than a detail of how one build draws it,
   * so it is stated here rather than reverse-engineered from the icon.
   */
  label: string;
  value: string;
  unit?: string;
  accent: string;
};

export type ActivityMark = { icon: SFSymbol; accent: string };

/** How an activity reached the app, as the row's small marks. */
const Marks: Record<ActivitySource, ActivityMark> = {
  linked: { icon: 'link', accent: Accents.recovery },
  uploaded: { icon: 'triangle.fill', accent: Accents.recovery },
  effort: { icon: 'bolt.fill', accent: Zones.hard },
};

/** `'Wed Sep 09, 2026 13:57'` — the row's timestamp line. */
export function formatActivityWhen(startedAt: Date): string {
  const date = startedAt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const time = startedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export function toActivityStats(activity: ActivityModel, units: UnitSystem): ActivityStat[] {
  const { stats, discipline } = activity;
  const out: ActivityStat[] = [];

  if (stats.distanceMetres !== undefined) {
    const distance = formatDistance(stats.distanceMetres, units, discipline);
    out.push({
      icon: 'ruler',
      label: 'Distance',
      value: distance.value,
      unit: distance.unit,
      accent: Accents.equipment,
    });
  }

  if (stats.durationSeconds !== undefined) {
    out.push({
      icon: 'clock',
      label: 'Time',
      value: formatDuration(stats.durationSeconds),
      accent: Accents.recovery,
    });
  }

  if (stats.paceSecondsPerKm !== undefined) {
    const speed = formatSpeed(stats.paceSecondsPerKm, units, discipline);
    out.push({
      icon: 'speedometer',
      /* "Pace" for the disciplines measured in time per distance, "Speed" for
         the ones measured the other way up — `formatSpeed` already chose. */
      label: speed.unit.startsWith('/') ? 'Pace' : 'Speed',
      value: speed.value,
      unit: speed.unit,
      accent: Accents.speed,
    });
  }

  if (stats.averageHeartRate !== undefined) {
    out.push({
      icon: 'heart.fill',
      label: 'Avg HR',
      value: `${Math.round(stats.averageHeartRate)}`,
      unit: 'bpm',
      accent: Accents.speed,
    });
  }

  if (stats.calories !== undefined) {
    out.push({
      icon: 'flame.fill',
      label: 'Calories',
      value: `${Math.round(stats.calories)}`,
      unit: 'kcal',
      accent: Zones.hard,
    });
  }

  return out;
}

export function toActivityRowProps(activity: ActivityModel, units: UnitSystem) {
  const discipline = Disciplines[activity.discipline];

  return {
    id: activity.id,
    when: formatActivityWhen(activity.startedAt),
    title: activity.title,
    icon: discipline.icon,
    accent: discipline.accent,
    place: activity.place ?? undefined,
    route: activity.route.length > 0 ? activity.route : undefined,
    stats: toActivityStats(activity, units),
    marks: activity.sources.map(source => Marks[source]),
  };
}

/** The Monday of the week `date` falls in, at local midnight. */
function weekStart(date: Date): Date {
  const start = new Date(date);
  // getDay is 0 for Sunday, which belongs to the week that began six days back.
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** `'Sep 7 - 13'`, or `'Aug 31 - Sep 6'` when the week straddles a month. */
function formatRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const month = (date: Date) => date.toLocaleDateString('en-US', { month: 'short' });
  const from = `${month(start)} ${start.getDate()}`;

  return start.getMonth() === end.getMonth()
    ? `${from} - ${end.getDate()}`
    : `${from} - ${month(end)} ${end.getDate()}`;
}

export type ActivityWeek = {
  id: string;
  meta: { range: string; plan: string };
  data: ActivityModel[];
};

/**
 * Groups activities, newest first, into consecutive weeks.
 *
 * `planLabel` resolves the week's caption — the plan and week number the
 * activities fell in. It is a callback because that is the training slice's
 * knowledge, not this module's.
 */
export function toActivityWeeks(
  activities: ActivityModel[],
  planLabel: (weekStarting: Date) => string,
): ActivityWeek[] {
  const weeks: ActivityWeek[] = [];
  let current: ActivityWeek | null = null;
  let currentKey = '';

  for (const activity of activities) {
    const start = weekStart(activity.startedAt);
    const key = start.toISOString().slice(0, 10);

    if (!current || key !== currentKey) {
      current = { id: `week-${key}`, meta: { range: formatRange(start), plan: planLabel(start) }, data: [] };
      currentKey = key;
      weeks.push(current);
    }

    current.data.push(activity);
  }

  return weeks;
}
