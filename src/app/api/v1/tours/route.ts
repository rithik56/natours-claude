import { list as respondWithList } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { projectFields } from '@/server/modules/tours/catalogue-query';
import {
  apiListQuerySchema,
  toApiCatalogueQuery,
} from '@/server/modules/tours/schemas';
import { list } from '@/server/modules/tours/service';

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
