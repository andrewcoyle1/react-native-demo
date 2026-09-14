/**
 * "Your plan overview" — the flow's last screen: a summary of everything
 * collected, and the button that saves it all and generates a plan.
 *
 * "Personalise my plan" sends one combined request — see
 * `services/onboarding` — that persists the profile, metrics and schedule and,
 * the first time, generates a plan and its opening week of sessions. Session
 * planning itself stays naive for now (see `docs/api.md`); what this
 * guarantees is that pressing the button always leaves real, saved data
 * behind. `UserProvider`'s `absent` -> `ready` flip, driven by `refresh()`
 * once the request resolves, is what actually ends onboarding — the root
 * gate is waiting on exactly that.
 */
import { Icon } from '@/components/icon';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { ThemedText } from '@/components/themed-text';
import { RaceCatalog, type CatalogRace } from '@/constants/race-catalog';
import { formatPace } from '@/domain/format';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import {
  useOnboardingFlow,
  type Gender,
  type OnboardingAnswers,
} from '@/providers/onboarding-flow-provider';
import { useUser, type UserSex } from '@/providers/user-provider';
import { Weekdays, type Weekday } from '@/components/onboarding/day-grid';
import type { OnboardingDraft } from '@/services/onboarding';
import { useServices } from '@/providers/services-provider';
import { reportError, trackEvent } from '@/services/telemetry';

import { NoRaceFlow, RaceFlow, stepProgress } from './flow-order';

const PLAN_ARTWORK = 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800';

/** What `personal-details.tsx` shows when nothing has been picked yet. */
const DEFAULT_DOB = { day: 1, month: 2, year: new Date().getFullYear() - 30 };

function ageFrom(dob: { day: number; month: number; year: number } | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.year;
  const hasHadBirthdayThisYear =
    now.getMonth() + 1 > dob.month ||
    (now.getMonth() + 1 === dob.month && now.getDate() >= dob.day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function dateFrom(dob: { day: number; month: number; year: number }): Date {
  return new Date(dob.year, dob.month - 1, dob.day);
}

/** The flow's three-way gender maps onto the profile's `UserSex` two-for-one:
    there is no "prefer not to say" there yet, so it folds into `other`. */
function sexFrom(gender: Gender): UserSex {
  return gender === 'male' || gender === 'female' ? gender : 'other';
}

/** `training-hours.tsx`'s bands, read back as a single representative number —
    a coarse self-assessment was never going to survive as a precise one. */
const HOURS_BAND_MIDPOINT: Record<string, number> = {
  lt5: 4,
  '5-8': 6.5,
  '8-10': 9,
  '10-12': 11,
  '12-14': 13,
};

function weeklyHoursFrom(band: string | null): number {
  return band ? (HOURS_BAND_MIDPOINT[band] ?? 6) : 6;
}

/** 0 = Sunday, matching `ScheduleDTO`; the flow's own list runs Monday-first. */
const WEEKDAY_INDEX: Record<Weekday, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

/**
 * The flow collects which days the athlete is free, not minutes per day, so
 * the weekly hours settled on above are spread evenly across them. A day
 * never chosen gets none.
 */
function availableMinutesFrom(answers: OnboardingAnswers): number[] {
  const weeklyMinutes = weeklyHoursFrom(answers.weeklyHoursBand) * 60;
  const days = answers.availableDays.length ? answers.availableDays : [...Weekdays];
  const perDay = Math.round(weeklyMinutes / days.length);

  const minutes = new Array(7).fill(0);
  for (const day of days) {
    minutes[WEEKDAY_INDEX[day]] = perDay;
  }
  return minutes;
}

const CATALOG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * `CatalogRace.date` is a free-form 'D Month YYYY' string, and `new Date(...)`
 * on that shape is not reliably parsed by Hermes the way it is by Node —
 * it can silently come back `Invalid Date`, which then serialises as
 * `'NaN-NaN-NaN'` and fails the server's date pattern. Parsed by hand instead.
 */
function parseCatalogDate(date: string): Date {
  const [day, month, year] = date.split(' ');
  const monthIndex = CATALOG_MONTHS.indexOf(month ?? '');
  return new Date(Number(year), monthIndex === -1 ? 0 : monthIndex, Number(day));
}

/** Standard-distance legs for the two series the local race catalog carries. */
function legsFor(race: CatalogRace): NonNullable<OnboardingDraft['race']>['legs'] {
  return race.distanceLabel === '100KM'
    ? [
        { discipline: 'swim', distanceMetres: 2000 },
        { discipline: 'ride', distanceMetres: 80000 },
        { discipline: 'run', distanceMetres: 18000 },
      ]
    : [
        { discipline: 'swim', distanceMetres: 1900 },
        { discipline: 'ride', distanceMetres: 90000 },
        { discipline: 'run', distanceMetres: 21100 },
      ];
}

function raceDraftFrom(answers: OnboardingAnswers): OnboardingDraft['race'] {
  const race = answers.raceId ? RaceCatalog.find(r => r.id === answers.raceId) : null;
  if (!race) {
    return null;
  }

  const targetSeconds =
    !answers.noTargetTime && (answers.targetHours || answers.targetMinutes)
      ? (answers.targetHours ?? 0) * 3600 + (answers.targetMinutes ?? 0) * 60
      : null;

  return {
    name: race.name,
    place: race.place,
    date: parseCatalogDate(race.date),
    priority: 'A',
    targetSeconds,
    legs: legsFor(race),
  };
}

function metricsFrom(answers: OnboardingAnswers): OnboardingDraft['metrics'] {
  return {
    heightCm: answers.heightCm,
    weightKg: answers.weightKg,
    ...(answers.heartRateUnknown
      ? {}
      : { heartRateMin: answers.heartRateMin, heartRateMax: answers.heartRateMax }),
    ...(answers.cyclingFtpUnknown ? {} : { cyclingFtp: answers.cyclingFtp }),
    ...(answers.runPaceUnknown ? {} : { runPaceSecondsPerKm: answers.runPaceSecondsPerKm }),
    ...(answers.swimPaceUnknown ? {} : { swimPaceSecondsPer100m: answers.swimPaceSecondsPer100m }),
  };
}

function draftFrom(answers: OnboardingAnswers): OnboardingDraft {
  return {
    profile: {
      name: answers.name.trim(),
      dateOfBirth: dateFrom(answers.dateOfBirth ?? DEFAULT_DOB),
      sex: sexFrom(answers.gender),
    },
    units: answers.distanceUnit,
    metrics: metricsFrom(answers),
    schedule: { availableMinutes: availableMinutesFrom(answers), commitments: [] },
    race: raceDraftFrom(answers),
    weeklyHours: weeklyHoursFrom(answers.weeklyHoursBand),
  };
}

export default function PlanOverviewScreen() {
  useScreenTracking('Plan overview');
  const theme = useTheme();
  const { answers } = useOnboardingFlow();
  const { user } = useAuth();
  const { refresh } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const race = answers.raceId ? RaceCatalog.find(r => r.id === answers.raceId) : null;
  const services = useServices();
  const age = ageFrom(answers.dateOfBirth);

  async function finish() {
    if (!user) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await services.onboarding.complete(user.uid, draftFrom(answers));
      /*
       * After the write, not before: the funnel's last step is "the plan was
       * created", and an event fired on the tap would also count everyone whose
       * request then failed.
       */
      trackEvent('onboarding_completed', {
        flow: answers.hasRace ? 'race' : 'no_race',
        step_count: (answers.hasRace ? RaceFlow : NoRaceFlow).length,
      });
      // The profile flipping from `absent` to `ready` is what flips the root
      // gate, exactly as signing in flips it off `(onboarding)` — but unlike
      // `create()`, this write did not go through `UserProvider`, so it has
      // no reason yet to know the fetch it's holding is stale.
      refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Something went wrong. Please try again.',
      );
      reportError(caught, 'onboarding: complete');
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingStep
      title="Your plan overview"
      subtitle="Review your plan details and confirm your training schedule"
      progress={stepProgress('plan-overview', answers.hasRace)}
      nextLabel="Personalise my plan"
      nextBusy={busy}
      onNext={finish}>
      <View style={[styles.planCard, { borderColor: '#E5B93F' }]}>
        <View style={styles.planHeader}>
          <View style={[styles.ring, { borderColor: '#E5B93F55' }]}>
            <Icon name="bolt.fill" size={16} tintColor="#E5B93F" />
          </View>
          <ThemedText style={styles.planHeaderText}>
            44 week {answers.planDistance ?? 'middle'} distance triathlon plan for:
          </ThemedText>
        </View>

        <Image source={{ uri: PLAN_ARTWORK }} style={styles.artwork} />

        <ThemedText style={styles.raceName}>{race?.name ?? 'Your race'}</ThemedText>
        {race ? (
          <ThemedText themeColor="textSecondary" style={styles.racePlace}>
            {race.place} {race.flag}
          </ThemedText>
        ) : null}
        {race ? <ThemedText style={styles.raceDate}>{race.date}</ThemedText> : null}

        <View style={[styles.statsRow, { backgroundColor: theme.background }]}>
          <Stat icon="figure.pool.swim" value="1.9" unit="km" sub="1.2 mi" />
          <Stat icon="bicycle" value="90" unit="km" sub="56 mi" />
          <Stat icon="figure.run" value="21.1" unit="km" sub="13.1 mi" />
        </View>
      </View>

      <View style={[styles.summaryCard, { borderColor: theme.backgroundSelected }]}>
        <View style={styles.summaryHeader}>
          <Icon name="person.circle" size={22} tintColor={theme.text} />
          <ThemedText style={styles.summaryTitle}>
            Athlete{age !== null ? `, ${age}` : ''}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.summaryLine}>
          {answers.heightCm}cm, {answers.weightKg}kg
        </ThemedText>

        <SummaryRow
          label="Heart rate range"
          value={`${answers.heartRateMin} - ${answers.heartRateMax} bpm`}
        />
        <SummaryRow
          label="Run threshold pace"
          value={`${formatPace(answers.runPaceSecondsPerKm)}/km`}
        />
        <SummaryRow label="Cycling threshold power (FTP)" value={`${answers.cyclingFtp}W`} />
        <SummaryRow
          label="Swim threshold pace"
          value={`${formatPace(answers.swimPaceSecondsPer100m)}/100m`}
        />
        <SummaryRow label="Current training volume" value={answers.weeklyHoursBand ?? '—'} />
      </View>

      {error ? (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}
    </OnboardingStep>
  );
}

function Stat({
  icon,
  value,
  unit,
  sub,
}: {
  icon: 'figure.pool.swim' | 'bicycle' | 'figure.run';
  value: string;
  unit: string;
  sub: string;
}) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={14} tintColor="#FFFFFF" />
      <ThemedText style={styles.statValue}>
        {value}{' '}
        <ThemedText themeColor="textSecondary" style={styles.statUnit}>
          {unit}
        </ThemedText>
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.statSub}>
        {sub}
      </ThemedText>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <ThemedText themeColor="textSecondary" style={styles.summaryLabel}>
        {label}
      </ThemedText>
      <ThemedText style={styles.summaryValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: 16,
    textAlign: 'center',
    color: '#E5484D',
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planHeaderText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  artwork: {
    width: '100%',
    height: 180,
    borderRadius: 14,
  },
  raceName: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
  },
  racePlace: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
  },
  raceDate: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  statUnit: {
    fontSize: 13,
    fontWeight: '400',
  },
  statSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  summaryCard: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
  },
  summaryLine: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 17,
  },
  summaryRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
  },
  summaryValue: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
});
