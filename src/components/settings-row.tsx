/**
 * One row of a settings list: a symbol, a title, whatever qualifies it, and a
 * chevron when it leads somewhere.
 *
 * Each row is its own card rather than a segment of a grouped table, which is
 * what lets a single row carry an accent — the danger-zone entries are the same
 * component wearing a different colour.
 */
import { Icon } from './icon';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from './themed-text';

import { AccentFillOpacity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SettingsRowProps = {
  title: string;
  /** Sits under the title; accented when `subtitleAccent` is given. */
  subtitle?: string;
  subtitleAccent?: string;
  /** Continues the subtitle line in the secondary colour. */
  subtitleTrailing?: string;
  /** A third line, always secondary — "Last synced: …". */
  caption?: string;
  icon?: SFSymbol;
  iconAccent?: string;
  /** Trailing state, opposite the title — "Enabled". */
  status?: string;
  statusAccent?: string;
  /** Adds a filled dot after the status. */
  statusDot?: boolean;
  /** Tints the card's border and fill. Omit for the ordinary neutral row. */
  accent?: string;
  /** Omit the chevron on rows that do not push anywhere. */
  chevron?: boolean;
  /**
   * Turns the row into a switch: the control sits where the chevron would, and
   * pressing anywhere on the row flips it.
   *
   * Mutually exclusive with `onPress` and `chevron` — a row that both toggles
   * and navigates has no honest affordance — so supplying this takes over both.
   */
  toggle?: { value: boolean; onValueChange: (value: boolean) => void };
  onPress?: () => void;
};

export function SettingsRow({
  title,
  subtitle,
  subtitleAccent,
  subtitleTrailing,
  caption,
  icon,
  iconAccent,
  status,
  statusAccent,
  statusDot,
  accent,
  chevron = true,
  toggle,
  onPress,
}: SettingsRowProps) {
  const theme = useTheme();

  const press = toggle ? () => toggle.onValueChange(!toggle.value) : onPress;

  return (
    <Pressable
      onPress={press}
      disabled={!press}
      accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityState={toggle ? { checked: toggle.value } : undefined}
      accessibilityLabel={[title, subtitle, caption, status].filter(Boolean).join('. ')}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: accent ?? theme.backgroundSelected,
          backgroundColor: accent ? `${accent}${AccentFillOpacity}` : theme.backgroundElement,
        },
        pressed && press && !toggle ? styles.pressed : null,
      ]}>
      {icon ? (
        <Icon name={icon} size={20} tintColor={iconAccent ?? theme.textSecondary} />
      ) : null}

      <View style={styles.text}>
        <ThemedText style={styles.title}>{title}</ThemedText>

        {subtitle ? (
          <ThemedText
            themeColor="textSecondary"
            style={[styles.subtitle, subtitleAccent ? { color: subtitleAccent } : null]}>
            {subtitle}
            {subtitleTrailing ? (
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {subtitleTrailing}
              </ThemedText>
            ) : null}
          </ThemedText>
        ) : null}

        {caption ? (
          <ThemedText themeColor="textSecondary" style={styles.caption}>
            {caption}
          </ThemedText>
        ) : null}
      </View>

      {status ? (
        <View style={styles.status}>
          <ThemedText
            themeColor="textSecondary"
            style={[styles.statusText, statusAccent ? { color: statusAccent } : null]}>
            {status}
          </ThemedText>
          {statusDot ? (
            <View style={[styles.dot, { backgroundColor: statusAccent ?? theme.textSecondary }]} />
          ) : null}
        </View>
      ) : null}

      {toggle ? (
        /* `pointerEvents="none"` so the row's own press is the single way to
           flip it. Left live, a tap landing on the switch would fire both its
           handler and the row's, and the value would toggle twice to nowhere. */
        <Switch
          value={toggle.value}
          onValueChange={toggle.onValueChange}
          pointerEvents="none"
          /* Not focusable: the row above it already carries the switch role and
             the label, so exposing both would read the setting out twice. */
          accessible={false}
        />
      ) : chevron ? (
        <Icon name="chevron.right" size={14} tintColor={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    /* Takes the slack so the status and chevron sit at the trailing edge. */
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: 500,
  },
  subtitle: {
    fontSize: 13,
  },
  caption: {
    fontSize: 12,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  statusText: {
    fontSize: 13,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
