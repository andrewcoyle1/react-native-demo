/**
 * Tapping a session in the alternate build opens that session.
 *
 * A real incident sits behind this. When the detail sheet was wired up, the
 * standard `WorkoutCard` and `PlanRow` got press targets and the gluestack
 * rows did not: the alternate Plan tab's rows were not pressable at all, and
 * the alternate Dashboard's rows shared one callback for the whole card, so
 * every session opened the release-notes sheet instead of itself.
 *
 * Both are the same mistake — a row that looks tappable and is not wired to
 * what it appears to open — and neither is visible in a screenshot.
 *
 * Only the Plan tab is rendered here. The Dashboard's rows would need
 * Reanimated's native worklets runtime, which its carousel pulls in and which
 * Jest cannot load; stubbing that out function by function would be building a
 * fake vendor, which is what `jest.setup.ts` exists to avoid. The Dashboard's
 * side of this is held by the type instead: `AltSession.onPress` is required,
 * so a route that does not supply one per session fails to compile. The Plan
 * tab's handler is required-but-nullable for the same reason.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ReactElement } from 'react';

import { AltPlanScreen } from '@/components/alt/plan-screen';

function mount(element: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}>
      {element}
    </SafeAreaProvider>,
  );
}

describe('the alternate Plan tab', () => {
  const day = (onPress: (() => void) | undefined, commitment = false) => ({
    id: 'mon',
    weekday: 'MON',
    day: '14',
    items: [
      {
        id: 'run-1',
        onPress,
        title: 'Easy Run',
        icon: 'figure.run' as const,
        accent: '#ffffff',
        target: '35 min',
        status: 'none' as const,
        commitment,
      },
    ],
  });

  const model = (days: ReturnType<typeof day>[]) => ({
    planLabel: '',
    phaseLabel: '',
    weekLabel: 'Week 1',
    weeksLabel: 'of 12',
    monthLabel: '2026 SEP',
    canGoBack: false,
    canGoForward: true,
    onStep: jest.fn(),
    volumes: [],
    total: { done: '0', planned: '0' },
    days,
  });

  it('opens the session when a row is tapped', async () => {
    const open = jest.fn();
    await mount(<AltPlanScreen model={model([day(open)])} />);

    // The bug: these rows carried no press target at all.
    fireEvent.press(screen.getByLabelText('Easy Run'));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('leaves a commitment inert', async () => {
    await mount(<AltPlanScreen model={model([day(undefined, true)])} />);

    // A standing gym block has no session to open, so it must not announce
    // itself to a screen reader as a button that does nothing.
    expect(screen.queryByLabelText('Easy Run')).toBeNull();
  });
});
