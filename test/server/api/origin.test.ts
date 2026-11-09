import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import {
  corsHeaders,
  handlePreflight,
  isAllowedOrigin,
} from '@/server/api/origin';

// CORS_ORIGINS is read on the first getConfig() call, so it is set before any test runs.
vi.stubEnv(
  'CORS_ORIGINS',
  'https://partner.example, https://second-partner.example:8443',
);

const APP = 'http://localhost:3000';
const PARTNER = 'https://partner.example';

function preflight(origin: string | null): NextRequest {
  const headers = new Headers({ 'access-control-request-method': 'POST' });
  if (origin !== null) headers.set('origin', origin);
  return new NextRequest(`${APP}/api/v1/tours`, { method: 'OPTIONS', headers });
}

describe('isAllowedOrigin', () => {
  it('[S9] accepts no Origin header, the app origin and every CORS_ORIGINS entry', () => {
    expect(isAllowedOrigin(null)).toBe(true);
    expect(isAllowedOrigin(APP)).toBe(true);
    expect(isAllowedOrigin(PARTNER)).toBe(true);
    expect(isAllowedOrigin('https://second-partner.example:8443')).toBe(true);
  });

  it('[S9] refuses any other origin, including near misses', () => {
    const refused = [
      'https://evil.example',
      'http://localhost:3001',
      'https://localhost:3000',
      'http://localhost:3000.evil.example',
      'https://partner.example.evil.example',
      'https://partner.example:8443',
      'https://PARTNER.example',
      'null',
      '',
      '*',
    ];

    for (const origin of refused) {
      expect(isAllowedOrigin(origin)).toBe(false);
    }
  });
});

describe('corsHeaders', () => {
  it('[S10] gives Allow-Origin and Vary only to a CORS_ORIGINS entry, and never credentials', () => {
    expect(corsHeaders(PARTNER)).toEqual({
      'Access-Control-Allow-Origin': PARTNER,
      Vary: 'Origin',
    });
  });

  it('[S10] gives nothing to the app origin itself, to a stranger, to no origin or to a wildcard', () => {
    for (const origin of [APP, 'https://evil.example', null, '*', 'null', '']) {
      expect(corsHeaders(origin)).toEqual({});
    }
  });

  it('[S10] is computed per call: a listed and a non-listed origin differ', () => {
    const listed = corsHeaders(PARTNER);
    const stranger = corsHeaders('https://evil.example');
    const listedAgain = corsHeaders(PARTNER);

    expect('Access-Control-Allow-Origin' in listed).toBe(true);
    expect('Access-Control-Allow-Origin' in stranger).toBe(false);
    expect('Access-Control-Allow-Origin' in listedAgain).toBe(true);
  });

  it('[S10] gives nothing to anyone when CORS_ORIGINS is empty', async () => {
    vi.stubEnv('CORS_ORIGINS', '');
    vi.resetModules();

    const fresh = await import('@/server/api/origin');

    expect(fresh.corsHeaders(PARTNER)).toEqual({});
    expect(fresh.isAllowedOrigin(PARTNER)).toBe(false);
    vi.stubEnv(
      'CORS_ORIGINS',
      'https://partner.example, https://second-partner.example:8443',
    );
  });
});

describe('handlePreflight', () => {
  it('[S10] answers a listed origin with 204 and the allowed methods and headers', () => {
    const response = handlePreflight(preflight(PARTNER));

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(PARTNER);
    expect(response.headers.get('access-control-allow-methods')).toBe(
      'GET, POST, PUT, PATCH, DELETE',
    );
    expect(response.headers.get('access-control-allow-headers')).toBe(
      'content-type',
    );
    expect(response.headers.get('access-control-max-age')).toBe('600');
    expect(response.headers.get('access-control-allow-credentials')).toBeNull();
  });

  it('[S10] answers a stranger and a request with no Origin with 204 and no Access-Control header', () => {
    for (const origin of ['https://evil.example', null, APP]) {
      const response = handlePreflight(preflight(origin));

      const names = [...response.headers.keys()].filter((name) =>
        name.startsWith('access-control-'),
      );
      expect(response.status).toBe(204);
      expect(names).toEqual([]);
    }
  });
});
