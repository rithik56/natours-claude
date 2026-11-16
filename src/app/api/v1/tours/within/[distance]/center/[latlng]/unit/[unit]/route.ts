import { ok } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { withinParamsSchema } from '@/server/modules/tours/schemas';
import { toursWithin } from '@/server/modules/tours/service';
import { z } from '@/server/validation';

// GET /api/v1/tours/within/[distance]/center/[latlng]/unit/[unit] (plan.md 4.1, B3): public. The
// tours whose start lies inside the radius, as documents. Every coordinate and the distance are
// range-checked before MongoDB is queried (T-04-29), and the response is not paginated.
export const GET = withApi(
  async ({ params }) =>
    ok({
      tours: await toursWithin({
        lat: params.latlng.lat,
        lng: params.latlng.lng,
        distance: params.distance,
        unit: params.unit,
      }),
    }),
  {
    access: 'public',
    params: withinParamsSchema,
    query: z.strictObject({}),
  },
);
