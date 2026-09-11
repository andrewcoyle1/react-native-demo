/**
 * A card with a status dot on its trailing edge — "Not connected" in grey,
 * or a state's own colour once it changes. Shared by connect-your-apps
 * (Garmin, Strava, Wahoo, Zwift, Apple Watch) and the single notifications
 * row, which is the same shape without a brand tint on the card itself.
 *
 * This is a status indicator, not a switch: connecting a platform or granting
 * notification permission is a native, out-of-app action, so pressing the row
 * is what starts that action rather than flipping a boolean directly.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../themed-text';

import { useTheme } from '@/hooks/use-theme';

type StatusRowProps = {
  icon: React.ReactNode;
  label: string;
  description?: string;
  /** The tinted hairline the design gives each connected platform's brand. */
  accent?: string;
  connected: boolean;
  connectedLabel?: string;
  disconnectedLabel?: string;
  onPress: () => void;
  note?: string;
};

export function StatusRow({
  icon,
  label,
  description,
  accent,
  connected,
  connectedLabel = 'Enabled',
  disconnectedLabel = 'Not connected',
  onPress,
  note,
}: StatusRowProps) {
  const theme = useTheme();
  const dotColor = connected ? theme.text : theme.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: connected }}
      accessibilityLabel={`${label}, ${connected ? connectedLabel : disconnectedLabel}`}
      style={[
        styles.card,
        {
          borderColor: accent ?? theme.backgroundSelected,
          backgroundColor: accent ? `${accent}14` : theme.backgroundElement,
        },
      ]}>
      <View style={styles.row}>
        <View style={styles.leading}>
          {icon}
          <View style={styles.text}>
            <ThemedText style={styles.label}>{label}</ThemedText>
            {description ? (
              <ThemedText themeColor="textSecondary" style={styles.description}>
                {description}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <View style={styles.status}>
          <ThemedText style={[styles.statusLabel, { color: connected ? '#3FB984' : theme.textSecondary }]}>
            {connected ? connectedLabel : disconnectedLabel}
          </ThemedText>
          <View
            style={[
              styles.dot,
              connected
                ? { backgroundColor: '#3FB984' }
                : { borderWidth: 1, borderColor: dotColor },
            ]}
          />
        </View>
      </View>
      {note ? (
        <ThemedText themeColor="textSecondary" style={styles.note}>
          {note}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  text: {
    flexShrink: 1,
    gap: 2,
  },
  label: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '500',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  note: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 34,
  },
});
