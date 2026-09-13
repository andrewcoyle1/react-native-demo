/**
 * "Update your availability" — which days may hold a workout at all, and which
 * days each discipline prefers.
 *
 * The sections are ordered by how much they constrain: availability first,
 * because every row under it is a subset of that week. Choosing a day here and
 * then removing it from the available set would leave a preference the plan can
 * never honour, so `prune` below keeps the subsets true whenever the top row
 * changes — rather than letting the athlete build a contradiction and refusing
 * it at save time.
 *
 * Long ride and long run are single-select and restricted further still, to the
 * days already preferred for that discipline: a long run on a day you never run
 * is not a thing to offer.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DayRow } from '@/components/day-row';
import { Icon } from '@/components/icon';
import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { Accents, Spacing, Zones } from '@/constants/theme';
import { useScreenTracking } from '@/hooks/use-screen-tracking';
import { useSettings, type Preferences, type Weekday } from '@/providers/settings-provider';

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

function Section({
  title,
  icon,
  accent,
  children,
}: {
  title?: string;
  icon?: 'figure.pool.swim' | 'bicycle' | 'figure.run';
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.sectionHeader}>
          {icon ? <Icon name={icon} size={16} tintColor={accent} /> : null}
          <ThemedText style={[styles.sectionTitle, accent ? { color: accent } : null]}>
            {title}
          </ThemedText>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function Field({
  label,
  hint,
  onSelectAll,
  children,
}: {
  label: string;
  hint?: string;
  onSelectAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
        {onSelectAll ? (
          <Pressable
            onPress={onSelectAll}
            accessibilityRole="button"
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText style={styles.selectAll}>Select all</ThemedText>
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <ThemedText themeColor="textSecondary" style={styles.hint}>
          {hint}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

export default function AvailabilityModal() {
  useScreenTracking('Availability');

  const { state, updatePreferences } = useSettings();
  const ready = state.status === 'ready' ? state : null;

  const [draft, setDraft] = useState<Preferences | null>(ready?.preferences ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!draft) {
    return (
      <SettingsModal title="Update your availability" icon="calendar" iconAccent={Accents.schedule}>
        <ThemedText themeColor="textSecondary" style={styles.loading}>
          Loading your preferences…
        </ThemedText>
      </SettingsModal>
    );
  }

  /**
   * Applies a change and re-narrows everything that depends on it.
   *
   * Every per-discipline row is intersected back against the available days,
   * and each long day is dropped if it is no longer one of that discipline's.
   * Doing it on every edit means the draft is always internally consistent, so
   * saving never has to validate.
   */
  function edit(changes: Partial<Preferences>) {
    setDraft(previous => {
      if (!previous) {
        return previous;
      }

      const next = { ...previous, ...changes };
      const within = (days: Weekday[]) => days.filter(day => next.availableDays.includes(day));

      const swimDays = within(next.swimDays);
      const cycleDays = within(next.cycleDays);
      const runDays = within(next.runDays);

      return {
        ...next,
        swimDays,
        cycleDays,
        runDays,
        oneWorkoutDays: within(next.oneWorkoutDays),
        longRideDay:
          next.longRideDay !== null && cycleDays.includes(next.longRideDay)
            ? next.longRideDay
            : null,
        longRunDay:
          next.longRunDay !== null && runDays.includes(next.longRunDay) ? next.longRunDay : null,
      };
    });
  }

  async function save() {
    if (!draft) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updatePreferences(draft);
      router.back();
    } catch {
      setError('Could not save your availability.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsModal
      title="Update your availability"
      icon="calendar"
      iconAccent={Accents.schedule}
      scrollable
      confirmLabel="Save"
      onConfirm={save}
      confirmDisabled={saving}
      error={error}>
      <Section>
        <Field
          label="Days available to train"
          hint="Workouts are only ever scheduled on these days."
          onSelectAll={() => edit({ availableDays: [...ALL_DAYS] })}>
          <DayRow
            selected={draft.availableDays}
            onChange={availableDays => edit({ availableDays })}
          />
        </Field>
      </Section>

      <Section title="Swimming" icon="figure.pool.swim" accent={Zones.swim}>
        <Field
          label="Preferred swim days"
          hint="Extra swims may be scheduled on other available days."
          onSelectAll={() => edit({ swimDays: [...draft.availableDays] })}>
          <DayRow
            selected={draft.swimDays}
            onChange={swimDays => edit({ swimDays })}
            accent={Zones.swim}
            enabledDays={draft.availableDays}
          />
        </Field>
      </Section>

      <Section title="Cycling" icon="bicycle" accent={Zones.ride}>
        <Field
          label="Preferred cycle days"
          hint="Extra rides may be scheduled on other available days."
          onSelectAll={() => edit({ cycleDays: [...draft.availableDays] })}>
          <DayRow
            selected={draft.cycleDays}
            onChange={cycleDays => edit({ cycleDays })}
            accent={Zones.ride}
            enabledDays={draft.availableDays}
          />
        </Field>

        <Field label="Preferred long ride day">
          <DayRow
            selected={draft.longRideDay === null ? [] : [draft.longRideDay]}
            onChange={days => edit({ longRideDay: days[0] ?? null })}
            accent={Zones.ride}
            mode="single"
            enabledDays={draft.cycleDays}
          />
        </Field>
      </Section>

      <Section title="Running" icon="figure.run" accent={Zones.hard}>
        <Field
          label="Preferred run days"
          hint="Extra runs may be scheduled on other available days."
          onSelectAll={() => edit({ runDays: [...draft.availableDays] })}>
          <DayRow
            selected={draft.runDays}
            onChange={runDays => edit({ runDays })}
            accent={Zones.hard}
            enabledDays={draft.availableDays}
          />
        </Field>

        <Field label="Preferred long run day">
          <DayRow
            selected={draft.longRunDay === null ? [] : [draft.longRunDay]}
            onChange={days => edit({ longRunDay: days[0] ?? null })}
            accent={Zones.hard}
            mode="single"
            enabledDays={draft.runDays}
          />
        </Field>
      </Section>

      <Section>
        <Field
          label="Preferred one-workout days"
          hint="We'll try to keep these days to one workout if possible.">
          <DayRow
            selected={draft.oneWorkoutDays}
            onChange={oneWorkoutDays => edit({ oneWorkoutDays })}
            enabledDays={draft.availableDays}
          />
        </Field>
      </Section>
    </SettingsModal>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  field: {
    gap: Spacing.two,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 15,
  },
  selectAll: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    /* Pulled up under the label: it qualifies the question rather than
       starting a block of its own. */
    marginTop: -Spacing.one,
  },
  loading: {
    fontSize: 15,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
