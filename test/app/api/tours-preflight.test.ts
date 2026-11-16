// The CORS preflight on the three tour write routes (S10, contracts 2.3). A browser on an allowlisted
// origin sends OPTIONS before a cross-origin POST, PUT, PATCH or DELETE with a JSON or multipart body,
// so each route must answer OPTIONS itself, and the framework's own answer carries no CORS headers.
import { describe, expect, it, vi } from 'vitest';
import * as collection from '@/app/api/v1/tours/route';
import * as tour from '@/app/api/v1/tours/[id]/route';
import * as images from '@/app/api/v1/tours/[id]/images/route';
import { callRoute } from '../../helpers/call-route';

const PARTNER = 'https://partner.example';
const EVIL = 'https://evil.example';
const TOUR_ID = '0123456789abcdef01234567';

// CORS_ORIGINS is read on the first getConfig() call, so it is set before any test runs.
vi.stubEnv('CORS_ORIGINS', PARTNER);

type WriteRoute = {
  name: string;
  module: typeof collection | typeof tour | typeof images;
  path: string;
  params: Record<string, string>;
};

const WRITE_ROUTES: WriteRoute[] = [
  {
    name: 'tours collection',
    module: collection,
    path: '/api/v1/tours',
    params: {},
  },
  {
    name: 'tour',
    module: tour,
    path: `/api/v1/tours/${TOUR_ID}`,
    params: { id: TOUR_ID },
  },
  {
    name: 'tour images',
    module: images,
    path: `/api/v1/tours/${TOUR_ID}/images`,
    params: { id: TOUR_ID },
  },
];

describe('CORS preflight on the tour write routes (S10)', () => {
  it.each(WRITE_ROUTES)(
    '[S10] $name answers an allowlisted origin with 204 and the allowed methods and headers',
    async ({ module, path, params }) => {
      const result = await callRoute(module, {
        method: 'OPTIONS',
        path,
        params,
        origin: PARTNER,
      });

      expect(result.status).toBe(204);
      expect(result.headers.get('access-control-allow-origin')).toBe(PARTNER);
      expect(result.headers.get('access-control-allow-methods')).toBe(
        'GET, POST, PUT, PATCH, DELETE',
      );
      expect(result.headers.get('access-control-allow-headers')).toBe(
        'content-type',
      );
      expect(result.headers.get('access-control-max-age')).toBe('600');
      expect(result.headers.get('access-control-allow-credentials')).toBeNull();
    },
  );

  it.each(WRITE_ROUTES)(
    '[S10] $name names no origin, methods or headers for a stranger',
    async ({ module, path, params }) => {
      const result = await callRoute(module, {
        method: 'OPTIONS',
        path,
        params,
        origin: EVIL,
      });

      const corsNames = [...result.headers.keys()].filter((name) =>
        name.startsWith('access-control-'),
      );
      expect(result.status).toBe(204);
      expect(corsNames).toEqual([]);
    },
  );
});
