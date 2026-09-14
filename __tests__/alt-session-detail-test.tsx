/**
 * The gluestack build of the workout detail sheet.
 *
 * Renders the real fixtures through the real presenters, because the thing most
 * likely to break here is the recursion: the alternate build draws a repeat as
 * an indented block containing more steps, and a component that renders itself
 * is a component that can render nothing, or render forever, while
 * type-checking perfectly.
 *
 * It also holds the one property the two builds must share — they may differ in
 * how a session looks and never in what it says.
 */
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AltSessionDetailScreen,
  type AltSessionDetailModel,
} from '@/components/alt/session-detail-screen';
import {
  toActivityMetrics,
  toLapBars,
  toStreamCharts,
} from '@/presenters/activity-detail-presenter';
import {
  toChartBands,
  toDetailMetrics,
  toSessionDateLine,
  toWorkoutSets,
} from '@/presenters/session-detail-presenter';
import { toSessionSegments, toSessionTags } from '@/presenters/session-presenter';
import { createServices } from '@/services/container';

/**
 * The screen reads safe-area insets to clear the home indicator, and the
 * provider supplies none outside an app. A fixed frame is enough: nothing under
 * test depends on the inset's value, only on it existing.
 */
function mount(model: AltSessionDetailModel) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}>
      <AltSessionDetailScreen model={model} />
    </SafeAreaProvider>,
  );
}

const services = createServices('mock');
const UID = 'athlete-1';

async function modelFor(sessionId: string): Promise<AltSessionDetailModel> {
  const session = await services.sessions.get(UID, sessionId);
  if (!session) {
    throw new Error(`fixture missing: ${sessionId}`);
  }

  const activityId = session.completion?.activityId ?? null;
  const activity = activityId ? await services.activities.get(UID, activityId) : null;

  return {
    dateLine: toSessionDateLine(session.date),
    title: session.title,
    icon: 'figure.run',
    iconAccent: '#ffffff',
    completed: session.completion !== null,
    tab: 'planned',
    onTab: jest.fn(),
    hasCompleted: activity !== null,
    onClose: jest.fn(),
    planned: {
      tags: toSessionTags(session).map(tag => tag.label),
      metrics: toDetailMetrics(session, 'metric'),
      footnote: null,
      segments: toSessionSegments(session),
      bands: toChartBands(session),
      totalMinutes: 40,
      coach:
        session.coachName && session.coachNote
          ? { name: session.coachName, note: session.coachNote }
          : null,
      sets: toWorkoutSets(session, 'metric'),
      connections: [],
    },
    recorded: activity
      ? {
          title: activity.title,
          route: activity.route,
          metrics: toActivityMetrics(activity, 'metric'),
          rpe: activity.review?.rpe ?? null,
          laps: toLapBars(activity.laps),
          lapAxis: ['3:20', '5:20'],
          lapUnit: '/km',
          lapCount: activity.laps.length,
          charts: toStreamCharts(activity, 'metric', activity.discipline),
          onUncomplete: jest.fn(),
          busy: false,
        }
      : null,
  };
}

describe('the planned tab', () => {
  it('renders the swim to its full depth', async () => {
    await mount(await modelFor('swim-wag-board'));

    expect(screen.getByText('Wag that Board (a)')).toBeTruthy();
    // Every set label, which is the proof the list did not stop early.
    expect(screen.getByText('Warmup set')).toBeTruthy();
    expect(screen.getByText('Warmdown set')).toBeTruthy();
    // Three levels down: main set → Repeat 3x → Repeat 2x → the length itself.
    expect(screen.getAllByText('Repeat 2x').length).toBeGreaterThan(1);
    expect(screen.getByText('Board Wag')).toBeTruthy();
  });

  it('shows the coach note whole rather than clamped', async () => {
    const model = await modelFor('swim-wag-board');
    await mount(model);

    // The standard card collapses this; here the athlete opened the one
    // session, so withholding the coaching would be withholding the point.
    expect(screen.getByText(model.planned.coach!.note)).toBeTruthy();
  });

  it('says the same figures as the standard build', async () => {
    const model = await modelFor('run-easy-strides');
    await mount(model);

    /*
     * The two builds may differ in how a session looks and never in what it
     * says: both read their figures from `toDetailMetrics`.
     *
     * Asserted in the label's own case, not upper. The standard build shouts it
     * with `toUpperCase()`, this one with a `uppercase` class — so the text a
     * screen reader is handed here is still "Time", which is the better of the
     * two behaviours and worth pinning rather than papering over.
     */
    for (const metric of model.planned.metrics) {
      expect(screen.getAllByText(metric.label).length).toBeGreaterThan(0);
      expect(screen.getAllByText(new RegExp(metric.value, 'i')).length).toBeGreaterThan(0);
    }
  });
});

describe('the completed tab', () => {
  it('draws perceived effort as a proportion', async () => {
    const model = { ...(await modelFor('run-easy-strides')), tab: 'completed' as const };
    await mount(model);

    expect(model.recorded!.rpe).toBe(5);
    expect(screen.getByText('Perceived effort')).toBeTruthy();
    expect(screen.getByText('Uncomplete workout')).toBeTruthy();
  });

  it('renders every stream chart the activity recorded', async () => {
    const model = { ...(await modelFor('run-easy-strides')), tab: 'completed' as const };
    await mount(model);

    expect(screen.getByText('Pace')).toBeTruthy();
    expect(screen.getByText('Heart rate')).toBeTruthy();
    expect(screen.getByText('Cadence')).toBeTruthy();
    expect(screen.getByText('15 total')).toBeTruthy();
  });
});
