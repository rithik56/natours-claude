import { list as respondWithList } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { list } from '@/server/modules/tours/service';
import { z } from '@/server/validation';

// GET /api/v1/tours/top-5-cheap (plan.md 4.1, B2): the five cheapest tours, read through the
// same list() that GET /api/v1/tours calls. The query is built here, not read from the URL, so no
// caller value can change the sort or the limit (T-04-31). The empty strict query makes any
// parameter, such as ?limit=50, a 400 before any read.
export const GET = withApi(
  async () => {
    const result = await list({
      sort: ['price', '-ratingsAverage'],
      page: 1,
      limit: 5,
      clampPage: false,
    });
    return respondWithList('tours', result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  },
  { access: 'public', query: z.strictObject({}) },
);
