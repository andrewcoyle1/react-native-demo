/**
 * Section title with a quieter caption beside it — "Today", then the date.
 *
 * The caption is monospaced so a changing date does not shift the eye from day
 * to day, the way proportional digits would.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Fonts, Spacing } from '@/constants/theme';

type SectionHeadingProps = {
  title: string;
  caption?: string;
};

export function SectionHeading({ title, caption }: SectionHeadingProps) {
  return (
    <View style={styles.heading}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      {caption ? (
        <ThemedText themeColor="textSecondary" style={styles.caption}>
          {caption}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    /* 'baseline' rather than 'center': the two sizes differ, so this sits them
       on a shared line instead of centring their boxes. */
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  title: {
    fontSize: 30,
    /* Set explicitly: ThemedText's default preset carries a 24pt line height,
       which clips the caps of a 30pt title. */
    lineHeight: 36,
    fontWeight: 700,
  },
  caption: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
});
