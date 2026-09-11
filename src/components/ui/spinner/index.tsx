'use client';
import { ActivityIndicator } from 'react-native';
import React from 'react';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';


/*
 * `nativeStyleToProp` does not typecheck against NativeWind v5's `styled`.
 *
 * Its mapping type resolves the target prop's type and requires an object;
 * React Native types `style` as `StyleProp<T>`, a union that includes the
 * falsy members, so the conditional distributes and one branch lands on
 * `undefined`. It is a typing gap in the preview release, not a runtime one —
 * the mapping works. Suppressed rather than rewritten because these are
 * gluestack's own files, kept close to upstream so the next `add` is a clean
 * diff rather than a merge.
 */
const StyledActivityIndicator = styled(ActivityIndicator, {
  // @ts-expect-error - see above
  className: { target: 'style', nativeStyleToProp: { color: true } },
});
const spinnerStyle = tva({});

const Spinner = React.forwardRef<
  React.ComponentRef<typeof ActivityIndicator>,
  React.ComponentProps<typeof ActivityIndicator>
>(function Spinner(
  {
    className,
    color,
    focusable = false,
    'aria-label': ariaLabel = 'loading',
    ...props
  },
  ref
) {
  return (
    <StyledActivityIndicator
      ref={ref}
      focusable={focusable}
      aria-label={ariaLabel}
      {...props}
      color={color}
      className={spinnerStyle({ class: className })}
    />
  );
});

Spinner.displayName = 'Spinner';

export { Spinner };
