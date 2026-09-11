/**
 * In-memory state for the personalisation flow — the ~25 screens between
 * "verify your email" and the plan overview.
 *
 * Nothing here is persisted until the last screen: `plan-overview.tsx` reads
 * the whole of `answers` back and sends it in one request through
 * `services.onboarding` when "Personalise my plan" is pressed. This provider
 * only holds the in-progress draft.
 *
 * Every field is optional because the flow branches (a race answers the
 * distance question a different way than "no race planned" does) and a
 * screen only ever reads the slice it owns.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { AbilityAnswer } from '@/components/onboarding/ability-screen';
import type { Weekday } from '@/components/onboarding/day-grid';
import type { Discipline } from '@/domain/training';

export type PlanDistance = 'long' | 'middle' | 'olympic' | 'sprint';
export type TrainingGoal = 'fitness' | 'weight' | 'future-season';
export type Gender = 'male' | 'female' | 'unspecified';

export type OnboardingAnswers = {
  hasRace: boolean | null;
  goal: TrainingGoal | null;
  planDistance: PlanDistance | null;
  raceId: string | null;
  targetHours: number | null;
  targetMinutes: number | null;
  noTargetTime: boolean;
  ability: Partial<Record<Discipline, AbilityAnswer>>;
  name: string;
  dateOfBirth: { day: number; month: number; year: number } | null;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  heightUnit: 'cm' | 'ft-in';
  weightUnit: 'kg' | 'lb';
  heartRateMin: number;
  heartRateMax: number;
  heartRateUnknown: boolean;
  cyclingFtp: number;
  cyclingFtpUnknown: boolean;
  runPaceSecondsPerKm: number;
  runPaceUnknown: boolean;
  swimPaceSecondsPer100m: number;
  swimPaceUnknown: boolean;
  weeklyHoursBand: string | null;
  availableDays: Weekday[];
  preferredDays: Partial<Record<Discipline, Weekday[]>>;
  longRideDay: Weekday | null;
  longRunDay: Weekday | null;
  limitedDays: Weekday[];
  distanceUnit: 'metric' | 'imperial';
  poolSize: '20m' | '25m' | '30m' | '33m' | '50m';
  notificationsEnabled: boolean;
};

const defaultAnswers: OnboardingAnswers = {
  hasRace: null,
  goal: null,
  planDistance: null,
  raceId: null,
  targetHours: null,
  targetMinutes: null,
  noTargetTime: false,
  ability: {},
  name: '',
  dateOfBirth: null,
  gender: 'unspecified',
  heightCm: 175,
  weightKg: 75,
  heightUnit: 'cm',
  weightUnit: 'kg',
  heartRateMin: 60,
  heartRateMax: 189,
  heartRateUnknown: false,
  cyclingFtp: 250,
  cyclingFtpUnknown: false,
  runPaceSecondsPerKm: 290,
  runPaceUnknown: false,
  swimPaceSecondsPer100m: 110,
  swimPaceUnknown: false,
  weeklyHoursBand: null,
  availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  preferredDays: {},
  longRideDay: null,
  longRunDay: null,
  limitedDays: [],
  distanceUnit: 'metric',
  poolSize: '25m',
  notificationsEnabled: false,
};

type OnboardingFlowContextValue = {
  answers: OnboardingAnswers;
  update: (patch: Partial<OnboardingAnswers>) => void;
};

const OnboardingFlowContext = createContext<OnboardingFlowContextValue | null>(null);

export function OnboardingFlowProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers);

  const value = useMemo<OnboardingFlowContextValue>(
    () => ({
      answers,
      update: patch => setAnswers(current => ({ ...current, ...patch })),
    }),
    [answers],
  );

  return <OnboardingFlowContext value={value}>{children}</OnboardingFlowContext>;
}

export function useOnboardingFlow() {
  const context = useContext(OnboardingFlowContext);
  if (!context) {
    throw new Error('useOnboardingFlow must be used within OnboardingFlowProvider');
  }
  return context;
}
