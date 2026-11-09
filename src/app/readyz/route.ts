import { withApi } from '@/server/api/with-api';
import { pingDb } from '@/server/db';

// B10: readiness. Phase 5 adds the Redis check beside MongoDB.
export const GET = withApi(
  async () => {
    const up = await pingDb();
    return Response.json(
      {
        status: up ? 'ready' : 'not-ready',
        checks: { mongo: up ? 'up' : 'down' },
      },
      { status: up ? 200 : 503, headers: { 'cache-control': 'no-store' } },
    );
  },
  { access: 'public' },
);
