import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  /**
   * In-content heading. Omit it on screens that sit under a native header, so the
   * title isn't rendered twice.
   */
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

/** Scrollable screen shell with a title block and tab-bar-aware insets. */
export function Screen({ title, subtitle, children }: ScreenProps) {
  const theme = useTheme();
  const contentPlatformStyle = useScreenPadding();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      /*
       * iOS only. 'automatic' hands the top/bottom inset to UIKit, which already
       * knows how much of the scroll view a native header and the tab bar cover.
       * Adding `safeAreaInsets.top` ourselves on top of that was double-counting
       * the status bar and leaving a gap under the header.
       */
      contentInsetAdjustmentBehavior="automatic"
      /* Extra room past the tab bar so the last card clears it when scrolled. */
      contentInset={{ bottom: Spacing.four }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        {title || subtitle ? (
          <ThemedView style={styles.header}>
            {title ? <ThemedText type="subtitle">{title}</ThemedText> : null}
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
          </ThemedView>
        ) : null}
        {children}
      </ThemedView>
    </ScrollView>
  );
}

type CardProps = {
  title?: string;
  children: ReactNode;
  /** Layout overrides for the card box itself — height, flex, margins. */
  style?: StyleProp<ViewStyle>;
};

/** Grouped block of related controls or values. */
export function Card({ title, children, style }: CardProps) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.backgroundSelected }, style]}>
      {title ? (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardTitle}>
          {title.toUpperCase()}
        </ThemedText>
      ) : null}
      {children}
    </ThemedView>
  );
}

type RowProps = {
  label: string;
  value: string;
};

/** Label/value pair, for read-only diagnostic values. */
export function Row({ label, value }: RowProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="code" style={styles.rowValue} numberOfLines={1}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    /* 16pt, measured off the design: cards sit that far from the screen edge.
       Matches the dashboard's own gutter, which is set on its list rows. */
    paddingHorizontal: Spacing.three,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    /* Cards are separated from the page by this hairline, not by a lighter
       fill — the two surfaces sit one step apart on purpose. */
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  cardTitle: {
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
