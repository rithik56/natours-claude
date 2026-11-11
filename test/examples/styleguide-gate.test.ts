// Example: how to test the production gate on a dev-only route without starting a server.
// It follows page-data.test.ts: notFound() throws a digest, and the digest is what is asserted.
import { describe, expect, it } from 'vitest';
import { loadStyleguidePage } from '@/app/styleguide/gate';

function digestOf(error: unknown): string {
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' ? digest : 'no digest';
}

function failureOf(call: () => void): string {
  try {
    call();
    return 'resolved';
  } catch (error) {
    return digestOf(error);
  }
}

describe('example: the styleguide gate', () => {
  it('[S2] is a 404 when APP_ENV is production', () => {
    expect(failureOf(() => loadStyleguidePage('production'))).toBe(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    );
  });

  it.each(['development', 'test', 'ci', 'staging'] as const)(
    '[S2] renders when APP_ENV is %s',
    (appEnv) => {
      expect(failureOf(() => loadStyleguidePage(appEnv))).toBe('resolved');
    },
  );
});
