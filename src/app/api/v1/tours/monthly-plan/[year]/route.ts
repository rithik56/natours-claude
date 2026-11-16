import { ok } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { monthlyPlanParamsSchema } from '@/server/modules/tours/schemas';
import { getMonthlyPlan } from '@/server/modules/tours/service';
import { z } from '@/server/validation';

// GET /api/v1/tours/monthly-plan/[year] (plan.md 4.1, F2): guides, lead guides and admins only.
// Access is an exact role match (T-04-30), so an anonymous caller gets 401 and a user 403. The
// year is checked strictly before any read, and the plan groups starts by IST month (QA-10).
export const GET = withApi(
  async ({ params }) => ok({ plan: await getMonthlyPlan(params.year) }),
  {
    access: { roles: ['guide', 'lead-guide', 'admin'] },
    params: monthlyPlanParamsSchema,
    query: z.strictObject({}),
  },
);
