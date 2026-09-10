/**
 * The accounts the mock environment treats specially.
 *
 * Mock mode has to be able to reach every branch of every state union without a
 * backend, and the branch that is hardest to reach is the empty one: a real
 * account that simply has no data yet. Anonymous sign-in used to serve that
 * purpose — `mock-anonymous` was seeded with nothing — but anonymous auth is
 * gone, so the role passes to a reserved email.
 *
 * Kept here rather than repeated in each mock service, which is how the previous
 * arrangement ended up with the same literal in five files.
 */

/** Signing in with this fails, so the error path stays exercisable. */
export const MOCK_FAILING_EMAIL = 'fail@example.com';

/**
 * Signs in successfully to an account with no profile, plan, sessions or
 * activities — the state a real athlete is in for their first few seconds.
 */
export const MOCK_EMPTY_EMAIL = 'new@example.com';

/** The uid the mock auth service derives from an email. */
export function mockUidFor(email: string): string {
  return `mock-${email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

/** What the data mocks compare against to decide whether to seed anything. */
export const MOCK_EMPTY_UID = mockUidFor(MOCK_EMPTY_EMAIL);
