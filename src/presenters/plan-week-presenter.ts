/**
 * The Plan tab: what was planned set against what was actually done.
 *
 * The only presenter that reads two slices at once. Matching a recorded activity
 * to a planned session is a domain judgement rather than a rendering one, so the
 * rule is stated here in one place: an activity claims a session by id when the
 * backend has already matched them, and otherwise by falling on the same day in
 * the same discipline.
 */
import type { SFSymbol } from 'expo-symbols';

import { Disciplines } from '@/constants/disciplines';
import {
  formatDistance,
  formatDuration,
  formatDurationWords,
  formatSpeed,
} from '@/domain/format';
import { toDateKey, type DateKey, type Discipline, type UnitSystem } from '@/domain/training';
import type { ActivityModel } from '@/providers/activities-provider';
import type { SessionModel } from '@/providers/sessions-provider';

export type PlanRowStatus = 'done' | 'missed' | 'none';

export type PlannedItemProps = {
  id: string;
  title: string;
  icon: SFSymbol;
  accent: string;
  /** Planned figures, shown under the title. */
  target: string;
  status: PlanRowStatus;
  /** A recurring commitment rather than a session the plan generated. */
  commitment?: boolean;
  /** The activity that satisfied it, once one has been matched. */
  actual?: { at: string; title: string; stats: string[] };
};

export type PlannedDayProps = {
  id: string;
  weekday: string;
  day: string;
  items: PlannedItemProps[];
};

/** Strength work is a standing commitment, not something the plan composes. */
function isCommitment(session: SessionModel): boolean {
  return session.purpose === 'commitment' || session.discipline === 'weights';
}

/**
 * The recorded activity that satisfied a session, if any.
 *
 * Consumed activities are removed from `pool`, so two sessions in the same
 * discipline on the same day cannot both claim the same ride.
 */
function claimActivity(session: SessionModel, pool: ActivityModel[]): ActivityModel | null {
  const byId = pool.findIndex(activity => activity.sessionId === session.id);
  const index =
    byId >= 0
      ? byId
      : pool.findIndex(
          activity =>
            activity.discipline === session.discipline &&
            toDateKey(activity.startedAt) === session.date,
        );

  if (index < 0) {
    return null;
  }

  const [claimed] = pool.splice(index, 1);
  return claimed;
}

/** `'25 MIN    4.2 KM'`, or `'GYM SESSION'` for a session with no figures. */
function targetLine(session: SessionModel, units: UnitSystem): string {
  const parts: string[] = [];

  if (session.targets.durationSeconds !== undefined) {
    const time = formatDurationWords(session.targets.durationSeconds);
    parts.push(time.toUpperCase());
  }

  if (session.targets.distanceMetres !== undefined) {
    const distance = formatDistance(session.targets.distanceMetres, units, session.discipline);
    parts.push(`${distance.value} ${distance.unit}`.toUpperCase());
  }

  // Four spaces, matching the design's gap between the two figures.
  return parts.length > 0 ? parts.join('    ') : 'GYM SESSION';
}

function actualStats(activity: ActivityModel, units: UnitSystem): string[] {
  const stats: string[] = [];

  if (activity.stats.durationSeconds !== undefined) {
    stats.push(formatDuration(activity.stats.durationSeconds));
  }

  if (activity.stats.distanceMetres !== undefined) {
    const distance = formatDistance(activity.stats.distanceMetres, units, activity.discipline);
    stats.push(`${distance.value} ${distance.unit}`.toUpperCase());
  }

  if (activity.stats.paceSecondsPerKm !== undefined) {
    const speed = formatSpeed(activity.stats.paceSecondsPerKm, units, activity.discipline);
    stats.push(`${speed.value}${speed.unit}`.toUpperCase());
  }

  return stats;
}

function toPlannedItem(
  session: SessionModel,
  activity: ActivityModel | null,
  today: DateKey,
  units: UnitSystem,
): PlannedItemProps {
  const discipline = Disciplines[session.discipline];
  const done = activity !== null || session.completion !== null;

  return {
    id: session.id,
    title: session.title,
    icon: discipline.icon,
    accent: discipline.accent,
    target: targetLine(session, units),
    // A day still to come is neither done nor missed — it is simply pending.
    status: done ? 'done' : session.date < today ? 'missed' : 'none',
    ...(isCommitment(session) ? { commitment: true } : {}),
    ...(activity
      ? {
          actual: {
            at: activity.startedAt.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            title: activity.title,
            stats: actualStats(activity, units),
          },
        }
      : {}),
  };
}

export function toPlannedDays(
  sessions: SessionModel[],
  activities: ActivityModel[],
  units: UnitSystem,
  today: DateKey = toDateKey(new Date()),
): PlannedDayProps[] {
  // Copied because `claimActivity` consumes from it.
  const pool = [...activities];
  const days = new Map<DateKey, PlannedDayProps>();

  for (const session of sessions) {
    let day = days.get(session.date);

    if (!day) {
      const date = new Date(`${session.date}T00:00:00`);
      day = {
        id: session.date,
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
        day: `${date.getDate()}`,
        items: [],
      };
      days.set(session.date, day);
    }

    day.items.push(toPlannedItem(session, claimActivity(session, pool), today, units));
  }

  return [...days.values()];
}

export type DisciplineSummary = {
  id: Discipline;
  icon: SFSymbol;
  accent: string;
  done: string;
  planned: string;
  progress: number;
};

/** The sports the plan tracks volume for. Strength is a commitment, not volume. */
const TrackedDisciplines: Discipline[] = ['swim', 'ride', 'run'];

/**
 * The week's totals, in seconds.
 *
 * Restricted to the tracked disciplines so the total is the sum of the three
 * rings above it rather than a fourth, larger number that includes gym time.
 */
export function toWeekTotals(sessions: SessionModel[], activities: ActivityModel[]) {
  const planned = sessions
    .filter(session => TrackedDisciplines.includes(session.discipline))
    .reduce((total, session) => total + (session.targets.durationSeconds ?? 0), 0);

  const done = activities
    .filter(activity => TrackedDisciplines.includes(activity.discipline))
    .reduce((total, activity) => total + (activity.stats.durationSeconds ?? 0), 0);

  return { plannedSeconds: planned, doneSeconds: done };
}

/** The three rings: time done against time planned, per sport. */
export function toDisciplineSummaries(
  sessions: SessionModel[],
  activities: ActivityModel[],
): DisciplineSummary[] {
  return TrackedDisciplines.map(id => {
    const planned = sessions
      .filter(session => session.discipline === id)
      .reduce((total, session) => total + (session.targets.durationSeconds ?? 0), 0);

    const done = activities
      .filter(activity => activity.discipline === id)
      .reduce((total, activity) => total + (activity.stats.durationSeconds ?? 0), 0);

    return {
      id,
      icon: Disciplines[id].icon,
      accent: Disciplines[id].accent,
      done: formatDurationWords(done),
      planned: formatDurationWords(planned),
      // Clamped: an athlete who overshoots should fill the ring, not overflow it.
      progress: planned > 0 ? Math.min(done / planned, 1) : 0,
    };
  });
}
