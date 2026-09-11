/**
 * The gluestack-ui provider, rewritten for v5.
 *
 * The CLI generates a v4-shaped provider here, and it is wrong for this setup
 * in two ways that both matter:
 *
 * 1. It carries its own `config.ts` of design tokens and injects them at
 *    runtime through NativeWind's `vars()` — which is deprecated in v5, and
 *    would be a second source of truth fighting `src/global.css`. Tailwind v4
 *    is CSS-first; the stylesheet is the config.
 * 2. It takes a `mode` prop defaulting to `'light'` and calls
 *    `Appearance.setColorScheme(mode)` in an effect. That is process-wide, so
 *    simply mounting it would pin *the whole app* — every existing screen
 *    included — to light mode.
 *
 * So neither is kept. Appearance is left alone, and dark mode resolves through
 * the `prefers-color-scheme` block in `global.css`, exactly as the rest of the
 * app resolves it through `useColorScheme`.
 *
 * What remains is the part that is actually load-bearing: the overlay and toast
 * hosts every gluestack component that portals expects to find above it.
 */
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

export function GluestackUIProvider({
  children,
  style,
}: {
  children?: ReactNode;
  style?: ViewProps['style'];
}) {
  return (
    /* `flex: 1` rather than the generated `height/width: '100%'` pair: this
       mounts inside a flex column, where percentage sizing against an
       unmeasured parent collapses the content to nothing on Android. */
    <View style={[{ flex: 1 }, style]}>
      <OverlayProvider>
        <ToastProvider>{children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
