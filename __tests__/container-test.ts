/**
 * The composition root.
 *
 * This is the file the refactor existed to make testable: while `services` was
 * a module constant the environment was fixed at import time, and the switch
 * below could only be exercised by launching the app four times.
 *
 * What is worth asserting is not "the object has keys" — TypeScript covers
 * that — but the two things it cannot: that `mock` reaches no vendor at all,
 * and that `api` and `dev` disagree about which implementations they pick.
 * Getting those crossed is the failure this switch is most likely to produce
 * and the one nothing else would catch.
 */
import { createServices, type Services } from '@/services/container';

const KEYS: (keyof Services)[] = [
  'activities',
  'auth',
  'notes',
  'onboarding',
  'sessions',
  'settings',
  'consent',
  'training',
  'trends',
  'user',
  'analytics',
  'crash',
];

describe('createServices', () => {
  it('builds every dependency for every environment', () => {
    for (const env of ['mock', 'api', 'dev', 'prod'] as const) {
      const services = createServices(env);
      for (const key of KEYS) {
        expect(services[key]).toBeDefined();
      }
    }
  });

  it('returns a fresh container each call', () => {
    // The point of the refactor: a caller can hold two at once. If this ever
    // returns the same object, something has reintroduced a module singleton.
    expect(createServices('mock')).not.toBe(createServices('mock'));
  });

  it('gives mock a console-only analytics service, never Mixpanel', () => {
    const { analytics } = createServices('mock');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    analytics.trackEvent('probe_fired', { n: 1 });

    expect(log).toHaveBeenCalledWith(expect.stringContaining('[telemetry:mock]'), { n: 1 });
    log.mockRestore();
  });

  it('picks different implementations for api than for dev', () => {
    const api = createServices('api');
    const dev = createServices('dev');

    // The slices ported to the custom backend must differ; crossing these wires
    // an environment to the wrong backend and nothing else would say so.
    for (const key of ['auth', 'sessions', 'training', 'trends', 'user'] as const) {
      expect(api[key]).not.toBe(dev[key]);
    }
  });

  it('shares one implementation where that is deliberate', () => {
    const api = createServices('api');
    const dev = createServices('dev');

    // Firebase never had threshold figures, so `dev` runs on the mock settings
    // service on purpose. Asserted so the shortcut stays a decision.
    expect(dev.settings).toBe(createServices('mock').settings);
    expect(api.settings).not.toBe(dev.settings);

    // Notes were never ported, so both non-mock environments share Firebase.
    expect(api.notes).toBe(dev.notes);
  });
});
