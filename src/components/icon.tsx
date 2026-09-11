/**
 * The app's icon, drawn from one name on every platform.
 *
 * `SymbolView` only renders an SF Symbol when it is handed a plain string, and
 * a plain string is iOS-only: its Android implementation reads
 * `name[Platform.OS]` and renders the `fallback` — nothing, when none is given
 * — as soon as that lookup misses. Passing bare SF names, as the app did, is
 * therefore invisible on Android rather than merely unstyled.
 *
 * The cross-platform form is `{ ios, android }`, where the Android half names a
 * Material Symbol. Rather than spell that pair out at every call site, the map
 * below holds it once and this component resolves it, so screens and components
 * keep naming icons the way the design does — in SF Symbols.
 */
import { SymbolView } from 'expo-symbols';

import type { AndroidSymbol, SFSymbol, SymbolViewProps } from 'expo-symbols';

/**
 * Every SF Symbol the app draws, paired with its closest Material Symbol.
 *
 * The pairing is by meaning, not by shape: Material has no separate filled
 * variant under its own name, so `bell` and `bell.fill` both land on
 * `notifications` and the tint alone carries the selected state — which is how
 * the tab bar and header already distinguish them on iOS.
 *
 * A name absent here still renders on iOS and falls back to nothing on Android,
 * so add the pair when you add the icon.
 */
const MaterialEquivalent: Partial<Record<SFSymbol, AndroidSymbol>> = {
  /* Navigation and chrome. */
  'house': 'home',
  'house.fill': 'home',
  'calendar': 'calendar_month',
  'calendar.badge.plus': 'calendar_add_on',
  'flame': 'local_fire_department',
  'flame.fill': 'local_fire_department',
  'chart.line.uptrend.xyaxis': 'trending_up',
  'person.circle': 'account_circle',
  'person.crop.circle': 'account_circle',
  'bell': 'notifications',
  'bell.fill': 'notifications',
  'questionmark.bubble': 'contact_support',
  'questionmark.circle': 'help',
  'ellipsis': 'more_horiz',
  'xmark': 'close',
  'magnifyingglass': 'search',

  /* Movement between screens. */
  'arrow.left': 'arrow_back',
  'chevron.left': 'chevron_left',
  'chevron.right': 'chevron_right',
  'chevron.down': 'expand_more',
  'chevron.right.2': 'keyboard_double_arrow_right',
  'arrow.left.arrow.right': 'swap_horiz',

  /* Training: disciplines, purposes and the marks on a session. */
  'figure': 'person',
  'figure.run': 'directions_run',
  'figure.pool.swim': 'pool',
  'bicycle': 'directions_bike',
  'dumbbell': 'fitness_center',
  'infinity': 'all_inclusive',
  'speedometer': 'speed',
  'arrow.triangle.2.circlepath': 'autorenew',
  'chart.dots.scatter': 'scatter_plot',
  'clock': 'schedule',
  'bolt': 'bolt',
  'bolt.fill': 'bolt',
  'heart.fill': 'favorite',
  'heart.text.square': 'monitor_heart',
  'ruler': 'straighten',
  'flag': 'flag',
  'mappin.and.ellipse': 'location_on',
  /* Marks an activity as uploaded: Material's filled triangle is `details`. */
  'triangle.fill': 'details',

  /* Settings rows: preferences, connected devices, account. */
  'arrow.left.and.right': 'swap_horiz',
  'gauge.with.dots.needle.bottom.50percent': 'speed',
  'heart': 'favorite_border',
  'info.circle': 'info',
  'exclamationmark.circle': 'warning',
  'star.circle': 'stars',
  'play.circle': 'play_circle',
  'ticket': 'confirmation_number',
  'rectangle.portrait.and.arrow.right': 'logout',
  'paperplane': 'send',
  'battery.25': 'battery_2_bar',
  /* Wahoo's row: a wireless sensor rather than a named brand. */
  'wave.3.right': 'sensors',
  /* Zwift's row: indoor cycling. */
  'figure.indoor.cycle': 'pedal_bike',
  /*
   * Google's mark is no more in Material than Apple's is, so this falls back
   * to the generic account glyph rather than leaving the row blank — unlike
   * `apple.logo`, whose row is iOS-only anyway.
   */
  'g.circle.fill': 'account_circle',

  /* State and actions. */
  'checkmark': 'check',
  'checkmark.circle.fill': 'check_circle',
  'plus': 'add',
  'pencil': 'edit',
  'link': 'link',
  'camera': 'photo_camera',
  'envelope.open': 'drafts',
  'lightbulb': 'lightbulb',
  'ladybug': 'bug_report',
  'wrench.adjustable': 'handyman',
  'globe': 'language',
  'music.note': 'music_note',
  'play.rectangle': 'smart_display',
  'applewatch': 'watch',
  /* Face ID is an iOS affordance; Android's equivalent prompt is biometric. */
  'faceid': 'fingerprint',

  /*
   * `apple.logo` has no Material counterpart and deliberately gets none: it
   * brands the Sign in with Apple button, which must not wear another mark.
   * On Android it renders nothing, which is correct — that provider is iOS-only.
   */
};

export type IconProps = Omit<SymbolViewProps, 'name'> & { name: SFSymbol };

/**
 * Note on `weight`: it is forwarded, but Android only honours the per-platform
 * object form — `getFont` reads `weight.android` and falls back to regular for
 * a plain string. Every call site here passes a string, so Android draws every
 * glyph at regular while iOS keeps the design's lighter stroke. That is a
 * difference in stroke only, and Material's regular already sits close to it.
 */
export function Icon({ name, ...rest }: IconProps) {
  const android = MaterialEquivalent[name];

  return <SymbolView {...rest} name={android ? { ios: name, android, web: android } : name} />;
}
