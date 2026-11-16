import { ok } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { getStats } from '@/server/modules/tours/service';
import { z } from '@/server/validation';

// GET /api/v1/tours/stats (plan.md 4.1, F1): public. One row per difficulty, computed from the
// cached catalogue. The empty strict query makes any parameter a 400 before any read (QA-17).
export const GET = withApi(async () => ok({ stats: await getStats() }), {
  access: 'public',
  query: z.strictObject({}),
});
