import { withApi } from '@/server/api/with-api';

// S2: liveness only. It never touches the database and reveals nothing but the status.
export const GET = withApi(
  async () =>
    Response.json(
      { status: 'ok' },
      { headers: { 'cache-control': 'no-store' } },
    ),
  { access: 'public' },
);
