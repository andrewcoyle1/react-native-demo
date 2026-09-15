/**
 * Consent is bound to the athlete who gave it.
 *
 * This is a regression test with a real incident behind it. Consent used to be
 * stored per device with nothing recording *who* gave it, so deleting an
 * account and creating another inherited the previous athlete's answer — the
 * new one was tracked having never been asked. That is a consent failure, not a
 * cosmetic one, and it is invisible from the outside: the app looks identical
 * whether the answer belongs to you or to whoever held the handset before.
 *
 * The hook joins the stored answer to the signed-in uid, so these assertions
 * are the whole safety property. They are written against fakes rather than the
 * real providers because the point is the *join*, not Firebase.
 */
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';
import type { AnalyticsConsent } from '@/providers/device-preferences';
import { ServicesProvider } from '@/providers/services-provider';
import { createServices } from '@/services/container';

const mockStore = jest.fn();
let mockAuth: { user: { uid: string } | null; initializing: boolean };
let mockPreferences: {
  ready: boolean;
  analyticsConsent: AnalyticsConsent;
  analyticsConsentUid: string | null;
};

/*
 * The module also exports `useAnalyticsConsentPrompt`, which navigates, so
 * importing it drags in expo-router's navigator. Nothing under test here needs
 * a router, and a unit test should not be booting one.
 */
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('@/providers/auth-provider', () => ({ useAuth: () => mockAuth }));
jest.mock('@/providers/device-preferences', () => ({
  useDevicePreferences: () => ({ ...mockPreferences, setAnalyticsConsent: mockStore }),
}));

/**
 * Renders the hook and hands back the value it returned.
 *
 * `render` is awaited: React Native Testing Library 14 returns a promise, and
 * without the await the probe has not run and every assertion reads undefined.
 */
async function readConsent() {
  let value: ReturnType<typeof useAnalyticsConsent> | undefined;

  function Probe() {
    value = useAnalyticsConsent();
    return <Text>probe</Text>;
  }

  await render(
    <ServicesProvider services={createServices('mock')}>
      <Probe />
    </ServicesProvider>,
  );

  return value!;
}

beforeEach(() => {
  mockStore.mockClear();
  mockAuth = { user: { uid: 'athlete-1' }, initializing: false };
  mockPreferences = { ready: true, analyticsConsent: null, analyticsConsentUid: null };
});

describe('useAnalyticsConsent', () => {
  it('reads the athlete their own answer', async () => {
    mockPreferences = {
      ready: true,
      analyticsConsent: 'granted',
      analyticsConsentUid: 'athlete-1',
    };

    expect((await readConsent()).consent).toBe('granted');
  });

  it('treats another athlete’s answer as unasked', async () => {
    // The incident: account deleted, new account created on the same handset.
    // The stored 'granted' belongs to athlete-1 and must not carry over.
    mockPreferences = {
      ready: true,
      analyticsConsent: 'granted',
      analyticsConsentUid: 'athlete-1',
    };
    mockAuth = { user: { uid: 'athlete-2' }, initializing: false };

    expect((await readConsent()).consent).toBeNull();
  });

  it('keeps a refusal from leaking to the next athlete either', async () => {
    // Symmetry matters: inheriting 'denied' would silently suppress tracking
    // for someone who never refused, which is wrong in the quiet direction.
    mockPreferences = { ready: true, analyticsConsent: 'denied', analyticsConsentUid: 'athlete-1' };
    mockAuth = { user: { uid: 'athlete-2' }, initializing: false };

    expect((await readConsent()).consent).toBeNull();
  });

  it('treats an answer with no owner as unasked', async () => {
    // How a preferences file written before consent was uid-bound reads. It
    // must re-ask rather than honour an answer it cannot attribute.
    mockPreferences = { ready: true, analyticsConsent: 'granted', analyticsConsentUid: null };

    expect((await readConsent()).consent).toBeNull();
  });

  it('reads as unasked while signed out', async () => {
    mockPreferences = {
      ready: true,
      analyticsConsent: 'granted',
      analyticsConsentUid: 'athlete-1',
    };
    mockAuth = { user: null, initializing: false };

    expect((await readConsent()).consent).toBeNull();
  });

  it('is not ready until both the file and auth have resolved', async () => {
    mockAuth = { user: null, initializing: true };
    expect((await readConsent()).ready).toBe(false);

    mockAuth = { user: { uid: 'athlete-1' }, initializing: false };
    mockPreferences = { ready: false, analyticsConsent: null, analyticsConsentUid: null };
    expect((await readConsent()).ready).toBe(false);
  });

  it('records an answer against the athlete who gave it', async () => {
    (await readConsent()).record('granted');

    expect(mockStore).toHaveBeenCalledWith('granted', 'athlete-1');
  });

  it('records nothing when there is nobody to attribute it to', async () => {
    mockAuth = { user: null, initializing: false };

    (await readConsent()).record('granted');

    expect(mockStore).not.toHaveBeenCalled();
  });
});
