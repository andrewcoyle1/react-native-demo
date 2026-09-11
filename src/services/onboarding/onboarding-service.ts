/**
 * The onboarding seam: one call for everything "Personalise my plan" collects.
 *
 * Unlike the provider services this mirrors the shape of, there is nothing to
 * subscribe to here — the athlete's profile, plan and schedule are read back
 * through `UserProvider` and `TrainingProvider` once this resolves. This is
 * write-only on purpose.
 */
import type { Discipline } from '@/domain/training';
import type { UserSex } from '@/providers/user-provider';

export type OnboardingDraft = {
  profile: { name: string; dateOfBirth: Date; sex: UserSex };
  units: 'metric' | 'imperial';
  metrics: {
    heightCm?: number;
    weightKg?: number;
    heartRateMin?: number;
    heartRateMax?: number;
    cyclingFtp?: number;
    runPaceSecondsPerKm?: number;
    swimPaceSecondsPer100m?: number;
  };
  schedule: {
    availableMinutes: number[];
    commitments: { label: string; weekday: number; discipline: Discipline | null }[];
  };
  race?: {
    name: string;
    place: string;
    date: Date;
    priority: 'A' | 'B' | 'C';
    targetSeconds: number | null;
    legs: { discipline: Discipline; distanceMetres: number }[];
  } | null;
  weeklyHours: number;
};

export interface OnboardingService {
  /** Persists everything collected and, the first time, generates a plan. */
  complete(uid: string, draft: OnboardingDraft): Promise<void>;
}
