/**
 * In-memory `TrendsService`.
 *
 * Seeded with the figures that were hardcoded into the Trends screen, so mock
 * mode renders what the design showed. The reserved empty account gets zeroes,
 * which is what a brand-new athlete's trends genuinely look like.
 */
import type { TrendsModel, TrendsService } from './trends-service';

import { MOCK_EMPTY_UID } from '@/providers/shared/mock-accounts';

const SEEDED: TrendsModel = {
  planned: { durationSeconds: 8 * 3600 + 6 * 60, distanceMetres: 110_900 },
  completed: { durationSeconds: 4 * 3600 + 28 * 60, distanceMetres: 52_100 },
  fitness: { value: 38, direction: 'up', change: 2.4 },
  fatigue: { value: 68, direction: 'up', change: 9.1 },
  form: { value: -30, direction: 'down', change: -6.7 },
};

const EMPTY: TrendsModel = {
  planned: { durationSeconds: 0, distanceMetres: 0 },
  completed: { durationSeconds: 0, distanceMetres: 0 },
  fitness: { value: 0, direction: 'flat', change: 0 },
  fatigue: { value: 0, direction: 'flat', change: 0 },
  form: { value: 0, direction: 'flat', change: 0 },
};

export const mockTrendsService: TrendsService = {
  subscribe(uid, _window, onTrends, _onError) {
    const timer = setTimeout(() => onTrends(uid === MOCK_EMPTY_UID ? EMPTY : SEEDED), 0);
    return () => clearTimeout(timer);
  },
};
