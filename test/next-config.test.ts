import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('next.config security headers', () => {
  it('[S11] adds the static security headers to every path', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const headers = Object.fromEntries(
      (rules[0]?.headers ?? []).map(({ key, value }) => [key, value]),
    );

    expect(rules).toHaveLength(1);
    expect(rules[0]?.source).toBe('/:path*');
    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=63072000; includeSubDomains',
    );
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toBe(
      'camera=(), microphone=(), geolocation=(), browsing-topics=()',
    );
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('[S11] switches off the x-powered-by header', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('[D9] stops next dev writing an AGENTS.md into the repository', () => {
    expect(nextConfig.agentRules).toBe(false);
  });
});
