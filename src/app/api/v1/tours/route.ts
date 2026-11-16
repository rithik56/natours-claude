import { list as respondWithList } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { list } from '@/server/modules/tours/service';
import { z } from '@/server/validation';

// Task 2 of plan 04-04 replaces this with the full allowlist of filters, sort and fields.
const listQuery = z.strictObject({
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .optional(),
  limit: z
    .string()
    .regex(/^[1-9]\d*$/)
    .optional(),
});

// GET /api/v1/tours (plan.md 4.1): the same list() that `/` calls (B13).
export const GET = withApi(
  async ({ query }) => {
    const result = await list({
      sort: ['-createdAt'],
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 20),
      clampPage: false,
    });
    return respondWithList('tours', result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  },
  { access: 'public', query: listQuery },
);
