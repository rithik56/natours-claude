import { handlePreflight } from '@/server/api/origin';
import { created, list as respondWithList } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { projectFields } from '@/server/modules/tours/catalogue-query';
import {
  apiListQuerySchema,
  tourCreateSchema,
  toApiCatalogueQuery,
} from '@/server/modules/tours/schemas';
import { createTour, list } from '@/server/modules/tours/service';
import { z } from '@/server/validation';

// GET /api/v1/tours (plan.md 4.1): the same list() that `/` calls (B13). The query is
// strict (S7, B11): an unknown key, operator or bad value is a 400 before any read.
export const GET = withApi(
  async ({ query }) => {
    const result = await list(toApiCatalogueQuery(query));
    const items =
      query.fields === undefined
        ? result.items
        : projectFields(result.items, query.fields);
    return respondWithList('tours', items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  },
  { access: 'public', query: apiListQuerySchema },
);

// POST /api/v1/tours (plan.md 4.1, F6, D-12, D-13): lead guides and admins only (D-16). The body is
// strict JSON, so the cover, the gallery, the credits and the ratings cannot be sent. The new tour has
// no cover, so it stays out of the public catalogue until a photo with its credit is added.
export const POST = withApi(
  async ({ body }) => created({ tour: await createTour(body) }),
  {
    access: { roles: ['lead-guide', 'admin'] },
    query: z.strictObject({}),
    body: tourCreateSchema,
  },
);

// CORS preflight (S10, contracts 2.3): an allowlisted browser origin asks before this JSON POST.
export const OPTIONS = handlePreflight;
