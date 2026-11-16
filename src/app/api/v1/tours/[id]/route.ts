import { ok } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { getById, getGuides } from '@/server/modules/tours/service';
import { z } from '@/server/validation';

// A tour id is 24 hex characters. Anything else is a 400 before any read (B12, contracts 2.3).
const tourParams = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i),
});

// GET /api/v1/tours/[id] (plan.md 4.1, B12): the tour as its page shows it, with its public guides in order.
// The page and this route read the same detail (B13); the guides carry only id, name, photo and role (S3).
export const GET = withApi(
  async ({ params }) => {
    const tour = await getById(params.id);
    const guides = await getGuides(tour.id, tour.guideIds);
    return ok({ tour: { ...tour, guides } });
  },
  { access: 'public', params: tourParams },
);
