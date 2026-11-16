import { ok } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { distancesParamsSchema } from '@/server/modules/tours/schemas';
import { distancesFrom } from '@/server/modules/tours/service';
import { z } from '@/server/validation';

// GET /api/v1/tours/distances/[latlng]/unit/[unit] (plan.md 4.1, B3): public. Every tour's distance
// from the point, nearest first, rounded to 2 decimals in the requested unit. The point is
// range-checked before MongoDB is queried (T-04-29). The response is not paginated.
export const GET = withApi(
  async ({ params }) =>
    ok({
      distances: await distancesFrom({
        lat: params.latlng.lat,
        lng: params.latlng.lng,
        unit: params.unit,
      }),
    }),
  {
    access: 'public',
    params: distancesParamsSchema,
    query: z.strictObject({}),
  },
);
