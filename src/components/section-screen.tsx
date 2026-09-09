/**
 * Screen shell for a list grouped into sticky sections.
 *
 * A `SectionList` rather than `Screen`'s ScrollView for two reasons: it pins the
 * section header while its own section is on screen, which is the behaviour the
 * day headings need, and it only mounts the rows near the viewport instead of
 * every card in the plan.
 *
 * Horizontal padding sits on the rows and headers rather than on the content
 * container, so a pinned header's background reaches the screen edges. Padding
 * the container would leave a transparent strip either side for the scrolling
 * content to show through.
 */
import type { ReactElement, ReactNode } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useTheme } from '@/hooks/use-theme';

export type Section<TItem, TMeta = undefined> = {
  /** Stable identity for the section, used as its key. */
  id: string;
  /** Whatever the header needs to render itself — a date, a title, a count. */
  meta: TMeta;
  data: TItem[];
};

type SectionScreenProps<TItem, TMeta> = {
  sections: Section<TItem, TMeta>[];
  renderItem: (item: TItem) => ReactElement;
  renderHeader: (section: Section<TItem, TMeta>) => ReactElement;
  keyExtractor: (item: TItem) => string;
  /** Content above the first section — it scrolls away with everything else. */
  ListHeaderComponent?: ReactElement;
  ListFooterComponent?: ReactElement;
  /** Rendered outside the list, e.g. a `Stack.Toolbar`. */
  children?: ReactNode;
};

export function SectionScreen<TItem, TMeta>({
  sections,
  renderItem,
  renderHeader,
  keyExtractor,
  ListHeaderComponent,
  ListFooterComponent,
  children,
}: SectionScreenProps<TItem, TMeta>) {
  const theme = useTheme();
  const contentPlatformStyle = useScreenPadding();

  return (
    <>
      {children}

      <SectionList
        sections={sections}
        style={[styles.list, { backgroundColor: theme.background }]}
        /*
         * iOS only. 'automatic' hands the top/bottom inset to UIKit, which
         * already knows how much of the scroll view a native header and the tab
         * bar cover.
         */
        contentInsetAdjustmentBehavior="automatic"
        /* Extra room past the tab bar so the last card clears it when scrolled. */
        contentInset={{ bottom: Spacing.four }}
        contentContainerStyle={contentPlatformStyle}
        keyboardShouldPersistTaps="handled"
        /* Default on iOS, explicit here because it is the point of this shell. */
        stickySectionHeadersEnabled
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        renderSectionHeader={({ section }) => (
          // Opaque, or the rows would show through the pinned heading. The
          // background token is the page's own, so the header reads as the page
          // rather than as a bar laid over it.
          <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
            <View style={styles.column}>{renderHeader(section as Section<TItem, TMeta>)}</View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.column}>{renderItem(item)}</View>
          </View>
        )}
        /* Closes the gap between the last card of a day and the next heading. */
        renderSectionFooter={() => <ThemedView style={styles.sectionFooter} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  /* Centres the content column and caps it, the way `Screen` does — applied per
     row because there is no single wrapper to put it on. */
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  sectionHeader: {
    alignItems: 'center',
    /* 16pt, measured off the design: cards sit that far from the screen edge. */
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    /* Covers the row it pins over as it comes to rest under the native header. */
    paddingTop: Spacing.two,
  },
  row: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  sectionFooter: {
    height: Spacing.four,
  },
});
