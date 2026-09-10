/**
 * Where domain vocabulary picks up its paint.
 *
 * These tables were inside `sample-week.ts`, which meant deleting the sample
 * data would have taken the app's discipline icons with it. They are
 * presentation, not data: a service returns `discipline: 'swim'` and this is the
 * only place that decides swimming is `figure.pool.swim` in blue.
 *
 * Everything here is keyed by a union from `@/domain/training`, so adding a
 * discipline is a type error until it has been given an icon and a colour.
 */
import { Accents, Zones } from './theme';

import type { ChipProps } from '@/components/chip';
import type { Discipline, Purpose, Zone } from '@/domain/training';

import type { SFSymbol } from 'expo-symbols';

/** Disciplines carry one symbol and one colour wherever they appear. */
export const Disciplines: Record<Discipline, { icon: SFSymbol; accent: string; label: string }> = {
  swim: { icon: 'figure.pool.swim', accent: Zones.swim, label: 'Swim' },
  run: { icon: 'figure.run', accent: Zones.hard, label: 'Run' },
  ride: { icon: 'bicycle', accent: Zones.ride, label: 'Ride' },
  /** No zone colour of its own: strength work is off the effort scale. */
  weights: { icon: 'dumbbell', accent: '#9AA4AE', label: 'Strength' },
};

/** The purpose chip that leads a session's tag row. */
export const Purposes: Record<Purpose, ChipProps> = {
  recovery: { label: 'Recovery', accent: Accents.recovery, icon: 'arrow.triangle.2.circlepath' },
  endurance: { label: 'Endurance', accent: Accents.endurance, icon: 'infinity' },
  speed: { label: 'Speed', accent: Accents.speed, icon: 'speedometer' },
  commitment: {
    label: 'Commitment',
    accent: Accents.commitment,
    icon: 'arrow.triangle.2.circlepath',
  },
};

/** Effort bands, resolved to the colours the interval chart draws. */
export const ZoneColors: Record<Zone, string> = {
  warmup: Zones.warmup,
  easy: Zones.easy,
  hard: Zones.hard,
  swim: Zones.swim,
  ride: Zones.ride,
  sprint: Zones.sprint,
  drill: Zones.drill,
};

/** Technique and focus tags — 'Body position', 'Kicking'. */
export function focusChip(label: string): ChipProps {
  return { label, accent: Accents.info };
}

/** Kit the session asks the athlete to bring — 'Snorkel', 'Board'. */
export function equipmentChip(label: string): ChipProps {
  return { label, accent: Accents.equipment, icon: 'wrench.adjustable' };
}
