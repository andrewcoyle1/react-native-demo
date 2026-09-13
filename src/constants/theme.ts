/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    /*
     * Chrome — the header and the tab bar. These were sampled from the dark
     * design and, until they were themed, were applied in both appearances:
     * the wordmark and every header glyph came out near-white on white, and
     * the tab bar's capsule stayed a dark wash. The light values mirror the
     * dark ones' *relationships* rather than their hues: the title sits a
     * shade softer than the glyphs, and an unselected tab sits well back
     * from a selected one.
     */
    headerTitle: '#2B2B2B',
    icon: '#1C1C1E',
    iconInactive: '#8E8E93',
    /*
     * Tints the tab bar's glass. Neutral grey rather than the dark wash used
     * after dark, and rather than white: a white tint over a white page leaves
     * the capsule with no edge at all, so the icons read as floating loose on
     * the page instead of sitting on a bar.
     */
    glassTint: 'rgba(120, 120, 128, 0.18)',
    /*
     * The ground a modal sits on. Two of them, because only one platform blurs:
     * `scrim` tints the glass on iOS, where the blur does most of the
     * separating, while `scrimOpaque` is what Android and older iOS fall back
     * to — and with no blur behind it, it has to be near-solid or the page
     * underneath stays legible enough to tangle with the dialog's own text.
     *
     * Both follow the appearance rather than being fixed dark. The modal's
     * content is themed, so a dark scrim under light-mode text would put dark
     * on dark.
     */
    scrim: 'rgba(255, 255, 255, 0.6)',
    scrimOpaque: 'rgba(244, 244, 246, 0.97)',
  },
  /*
   * Sampled from the design: the page is #101010 rather than pure black, cards
   * sit one step above it at #171717, and #262626 is both the card hairline and
   * the selected/inactive tone. The three are close on purpose — the separation
   * comes from the border, not from a lighter slab.
   */
  dark: {
    text: '#ffffff',
    background: '#101010',
    backgroundElement: '#171717',
    backgroundSelected: '#262626',
    textSecondary: '#B0B4BA',
    /** Chrome, sampled from the design. See the light set for what these do. */
    headerTitle: '#D4D4D4',
    icon: '#E5E5E5',
    iconInactive: '#737373',
    glassTint: 'rgba(0, 0, 0, 0.35)',
    scrim: 'rgba(0, 0, 0, 0.55)',
    scrimOpaque: 'rgba(8, 8, 8, 0.97)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Plan accent. Fixed rather than themed: it is only ever used on artwork. */
export const ActivePlanAccent = '#9be87b';
export const ActivePlanHalo = '#6ca256';
export const InactivePlanAccent = '#95a2e3';
export const InactivePlanHalo = '#6467bb';

/**
 * Accents that carry meaning rather than mood: a workout's discipline tags, the
 * equipment it needs, its completion state. Fixed rather than themed — these
 * are the same colour in both appearances so a "needs equipment" chip never
 * reads as something else after dark.
 */
export const Accents = {
  /** Technique and focus tags. */
  info: '#5AA9E6',
  /** Equipment the session needs you to bring. */
  equipment: '#D4A72C',
  /** Completed, on track. */
  success: ActivePlanAccent,
  /** Scheduling and calendar affordances. */
  schedule: '#8B7CF6',
  /** Interval bars on the session chart. */
  interval: '#2F9BE0',
  /** Session purpose, one per kind. These label the workout, not its effort. */
  recovery: '#4A90E2',
  endurance: '#3FB984',
  speed: '#E5484D',
  commitment: '#6C5CE7',
} as const;

/**
 * Effort colours for the session chart. A workout is read by its shape and its
 * colour together, so these are named for what the athlete is doing rather than
 * for the hue — a "hard" block stays hard whichever discipline draws it.
 */
export const Zones = {
  /** Warm-up and cool-down: long, low, unhurried. */
  warmup: '#7A97AA',
  /** Easy aerobic work. */
  easy: '#E3B778',
  /** Hard running efforts. */
  hard: '#E8763C',
  /** Swim main sets. */
  swim: '#4FA3DC',
  /** Ride main sets. */
  ride: '#C77BAE',
  /** Short maximal efforts — strides, sprints. */
  sprint: '#E5484D',
  /** Drills, marked with hatching as well as colour. */
  drill: '#8B7CF6',
} as const;

/** Chip and tile fills. Kept low so the accent reads as an outline, not a slab. */
export const AccentFillOpacity = '22';

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
