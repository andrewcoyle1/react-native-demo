/**
 * "Your plan overview" — the flow's last screen: a summary of everything
 * collected, and the button that creates the profile.
 *
 * Plan generation itself is an open product question (see the data-layer plan
 * doc), and the server has no endpoint to receive a full set of onboarding
 * answers yet — but a profile is real and already has one: `POST /v1/profile`.
 * "Personalise my plan" creates it from the name, date of birth and gender
 * collected earlier in the flow, which is what actually ends onboarding —
 * `UserProvider`'s `absent` -> `ready` flip is what the root gate is waiting
 * on. Everything else this screen collected has nowhere to go yet and is
 * simply not sent.
 */
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { ThemedText } from '@/components/themed-text';
import { RaceCatalog } from '@/constants/race-catalog';
import { formatPace } from '@/domain/format';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useTheme } from '@/hooks/use-theme';
import { useOnboardingFlow, type Gender } from '@/providers/onboarding-flow-provider';
import { useUser, type UserSex } from '@/providers/user-provider';
import { reportError } from '@/services/telemetry';

import { stepProgress } from './flow-order';

const PLAN_ARTWORK = 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800';

/** What `personal-details.tsx` shows when nothing has been picked yet. */
const DEFAULT_DOB = { day: 1, month: 2, year: 95 };

function ageFrom(dob: { day: number; month: number; year: number } | null): number | null {
  if (!dob) return null;
  const fullYear = dob.year < 100 ? 1900 + dob.year : dob.year;
  const now = new Date();
  let age = now.getFullYear() - fullYear;
  const hasHadBirthdayThisYear =
    now.getMonth() + 1 > dob.month || (now.getMonth() + 1 === dob.month && now.getDate() >= dob.day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** The wheel picker's two-digit year is 19xx for anything not implausibly old. */
function dateFrom(dob: { day: number; month: number; year: number }): Date {
  const fullYear = dob.year < 100 ? 1900 + dob.year : dob.year;
  return new Date(fullYear, dob.month - 1, dob.day);
}

/** The flow's three-way gender maps onto the profile's `UserSex` two-for-one:
    there is no "prefer not to say" there yet, so it folds into `other`. */
function sexFrom(gender: Gender): UserSex {
  return gender === 'male' || gender === 'female' ? gender : 'other';
}

export default function PlanOverviewScreen() {
  useScreenTracking('Plan overview');
  const theme = useTheme();
  const { answers, submit } = useOnboardingFlow();
  const { create } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const race = answers.raceId ? RaceCatalog.find(r => r.id === answers.raceId) : null;
  const age = ageFrom(answers.dateOfBirth);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await create({
        name: answers.name.trim(),
        dateOfBirth: dateFrom(answers.dateOfBirth ?? DEFAULT_DOB),
        sex: sexFrom(answers.gender),
      });
      // The rest of what this screen collected has nowhere to go yet — see
      // the file header — but `submit()` stays the one seam that would send
      // it, so nothing here needs to change when it does.
      await submit();
      // No navigation needed: the profile flipping from `absent` to `ready`
      // flips the root gate, exactly as signing in flips it off `(onboarding)`.
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
      reportError(caught, 'onboarding: create profile');
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
            <SymbolView name="bolt.fill" size={16} tintColor="#E5B93F" />
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
          <SymbolView name="person.circle" size={22} tintColor={theme.text} />
          <ThemedText style={styles.summaryTitle}>
            Athlete{age !== null ? `, ${age}` : ''}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.summaryLine}>
          {answers.heightCm}cm, {answers.weightKg}kg
        </ThemedText>

        <SummaryRow label="Heart rate range" value={`${answers.heartRateMin} - ${answers.heartRateMax} bpm`} />
        <SummaryRow label="Run threshold pace" value={`${formatPace(answers.runPaceSecondsPerKm)}/km`} />
        <SummaryRow label="Cycling threshold power (FTP)" value={`${answers.cyclingFtp}W`} />
        <SummaryRow label="Swim threshold pace" value={`${formatPace(answers.swimPaceSecondsPer100m)}/100m`} />
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

function Stat({ icon, value, unit, sub }: { icon: 'figure.pool.swim' | 'bicycle' | 'figure.run'; value: string; unit: string; sub: string }) {
  return (
    <View style={styles.stat}>
      <SymbolView name={icon} size={14} tintColor="#FFFFFF" />
      <ThemedText style={styles.statValue}>
        {value} <ThemedText themeColor="textSecondary" style={styles.statUnit}>{unit}</ThemedText>
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
