/**
 * The workout detail sheet, from fixture to rendered tree.
 *
 * These go through the real mock service rather than hand-built objects, so
 * they check the whole chain the sheet actually runs — fixture, model,
 * presenter, component. A step tree three levels deep is exactly the kind of
 * thing that type-checks perfectly and still renders the wrong workout, and
 * nothing but reading the output catches that.
 */
import { render, screen } from '@testing-library/react-native';

import { WorkoutSteps } from '@/components/workout-steps';
import {
  toChartBands,
  toConnectionRows,
  toDetailMetrics,
  toEstimateFootnote,
  toSessionDateLine,
  toWorkoutSets,
} from '@/presenters/session-detail-presenter';
import {
  toActivityMetrics,
  toLapAxis,
  toLapBars,
  toReviewLabel,
  toStreamCharts,
} from '@/presenters/activity-detail-presenter';
import { createServices } from '@/services/container';
import type { ActivityModel } from '@/providers/activities-provider';
import type { SessionModel } from '@/providers/sessions-provider';

const services = createServices('mock');
const UID = 'athlete-1';

async function session(id: string): Promise<SessionModel> {
  const found = await services.sessions.get(UID, id);
  if (!found) {
    throw new Error(`fixture missing: ${id}`);
  }
  return found;
}

describe('planned tab', () => {
  it('reads the swim as six labelled sets', async () => {
    const swim = await session('swim-wag-board');

    expect(toWorkoutSets(swim, 'metric').map(set => set.label)).toEqual([
      'Warmup set',
      'Drill set',
      'Main set',
      'Skill set',
      'Speed set',
      'Warmdown set',
    ]);
  });

  it('keeps the main set nested rather than flattening it', async () => {
    const swim = await session('swim-wag-board');
    const main = toWorkoutSets(swim, 'metric').find(set => set.label === 'Main set')!;

    // "3 rounds of (2 x board wag, 2 x freestyle)" — three levels, and the
    // count at each one is the instruction. Flattening this to twelve lines
    // would be a different workout.
    const outer = main.steps[0];
    expect(outer.kind).toBe('repeat');
    if (outer.kind !== 'repeat') throw new Error('expected a repeat');

    expect(outer.label).toBe('Repeat 3x');
    expect(outer.children).toHaveLength(2);

    const inner = outer.children[0];
    if (inner.kind !== 'repeat') throw new Error('expected a nested repeat');
    expect(inner.label).toBe('Repeat 2x');

    const effort = inner.children[0];
    if (effort.kind !== 'effort') throw new Error('expected an effort');
    expect(effort.quantity).toBe('50m');
    expect(effort.name).toBe('Board Wag');
    expect(effort.zone).toBe('Z2');
    expect(effort.rest).toEqual({ label: '10s rest', open: false });
  });

  it('distinguishes an open rest from a timed one', async () => {
    const swim = await session('swim-wag-board');
    const warmup = toWorkoutSets(swim, 'metric')[0];
    const step = warmup.steps[0];
    if (step.kind !== 'effort') throw new Error('expected an effort');

    // Not a rest of unknown length — a different instruction entirely.
    expect(step.rest).toEqual({ label: 'Open rest', open: true });
  });

  it('bands the swim chart but not the ride', async () => {
    expect(toChartBands(await session('swim-wag-board')).map(band => band.label)).toEqual([
      'WU',
      'DRL',
      'MAIN',
      'SKL',
      'SPD',
      'WD',
    ]);

    // A single continuous effort has nothing to band, and an axis labelled
    // "MAIN" across its whole width would say nothing.
    expect(toChartBands(await session('ride-easy'))).toEqual([]);
  });

  it('adds intensity to the metric grid and footnotes the estimates', async () => {
    const run = await session('run-easy-strides');
    const metrics = toDetailMetrics(run, 'metric');

    expect(metrics.map(metric => metric.label)).toEqual([
      'Time',
      'Est. dist*',
      'Est. pace*',
      'Load',
      'Intensity',
    ]);
    expect(metrics.at(-1)?.value).toBe('Low');
    expect(toEstimateFootnote(run)).toBe('*Based on your run threshold pace of 4:30/km');
  });

  it('reads a ride in speed and a run in pace', async () => {
    const ride = toDetailMetrics(await session('ride-easy'), 'metric');
    const run = toDetailMetrics(await session('run-easy-strides'), 'metric');

    expect(ride.map(metric => metric.label)).toContain('Est. speed*');
    expect(run.map(metric => metric.label)).toContain('Est. pace*');
  });

  it('describes both kinds of connection', async () => {
    const rows = toConnectionRows((await session('ride-easy')).connections);

    expect(rows.map(row => row.title)).toEqual([
      'Resync to Garmin',
      'Download for indoor training apps',
    ]);
    expect(rows[0].subtitle).toMatch(/^Synced on /);
  });

  it('dates the header the way the design does', () => {
    expect(toSessionDateLine('2026-09-14')).toBe('MON, SEP 14');
  });

  it('renders the whole swim tree without throwing', async () => {
    const swim = await session('swim-wag-board');
    await render(<WorkoutSteps sets={toWorkoutSets(swim, 'metric')} />);

    // Proof the nesting survives all the way to the tree, not just the props.
    expect(screen.getByText('WARMDOWN SET')).toBeTruthy();
    expect(screen.getAllByText('Repeat 2x').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Board Wag')).toHaveLength(1);
  });
});

describe('completed tab', () => {
  async function activity(): Promise<ActivityModel> {
    const found = await services.activities.get(UID, 'run-easy-strides-activity');
    if (!found) {
      throw new Error('fixture missing');
    }
    return found;
  }

  it('reports what was recorded, not what was asked for', async () => {
    const metrics = toActivityMetrics(await activity(), 'metric');

    expect(metrics.map(metric => metric.label)).toEqual([
      'Time',
      'Distance',
      'Avg. pace',
      'Avg. HR',
      'Elevation',
      'Avg. cadence',
      'Calories',
    ]);
    // The exact clock, not the plan's rounded "35 min".
    expect(metrics[0].value).toBe('35:02');
  });

  it('sizes lap bars by distance so a stride is not a kilometre', async () => {
    const bars = toLapBars((await activity()).laps);

    expect(bars).toHaveLength(15);
    const kilometre = bars[0];
    const stride = bars[6];
    expect(kilometre.widthFraction).toBe(1);
    expect(stride.widthFraction).toBeLessThan(0.2);
    // And the stride is the faster of the two, which is what makes it tall.
    expect(stride.paceSecondsPerKm).toBeLessThan(kilometre.paceSecondsPerKm);
  });

  it('orders the lap axis fastest first', async () => {
    const axis = toLapAxis((await activity()).laps);
    expect(axis).toHaveLength(6);
    expect(axis[0] < axis[axis.length - 1]).toBe(true);
  });

  it('charts the three streams, inverting only pace', async () => {
    const charts = toStreamCharts(await activity(), 'metric', 'run');

    expect(charts.map(chart => chart.kind)).toEqual(['pace', 'heartRate', 'cadence']);
    // A smaller pace is a faster runner and belongs at the top of the plot;
    // a smaller heart rate does not.
    expect(charts[0].invert).toBe(true);
    expect(charts[1].invert).toBe(false);
    expect(charts[1].badge).toMatch(/^Avg HR \d+bpm$/);
    expect(charts[0].points.length).toBeGreaterThan(50);
  });

  it('drops a stream the watch did not record', async () => {
    const recorded = await activity();
    const noHeartRate = {
      ...recorded,
      samples: recorded.samples.map(({ atMetres, paceSecondsPerKm }) => ({
        atMetres,
        paceSecondsPerKm,
      })),
    };

    // An empty axis would read as a recording failure rather than as a swim.
    expect(toStreamCharts(noHeartRate, 'metric', 'run').map(chart => chart.kind)).toEqual(['pace']);
  });

  it('shows the review only when the athlete rated it', async () => {
    const recorded = await activity();
    expect(toReviewLabel(recorded)).toBe('Workout review: RPE 5/10');
    expect(toReviewLabel({ ...recorded, review: null })).toBeNull();
  });
});
