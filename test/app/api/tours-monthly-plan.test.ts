import { describe, expect, it } from 'vitest';
import * as route from '@/app/api/v1/tours/monthly-plan/[year]/route';
import { fromIstDay } from '@/lib/ist';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import { createTour, createUser } from '../../helpers/factories';

type PlanBody = {
  status: string;
  data: {
    plan: Array<{ month: number; numTourStarts: number; tours: string[] }>;
  };
};

type ErrorBody = { status: string; error: { code: string } };

async function getPlan(
  year: string,
  options: { as?: { _id: unknown }; path?: string } = {},
) {
  return callRoute(route, {
    path: options.path ?? `/api/v1/tours/monthly-plan/${year}`,
    params: { year },
    as: options.as,
  });
}

describe('GET /api/v1/tours/monthly-plan/[year]', () => {
  useTestDatabase();

  describe('who may read the plan (F2, T-04-30)', () => {
    it('[F2] an anonymous caller gets 401 UNAUTHENTICATED', async () => {
      const response = await getPlan('2027');

      expect(response.status).toBe(401);
      expect((response.body as ErrorBody).error.code).toBe('UNAUTHENTICATED');
    });

    it('[F2] a user gets 403 FORBIDDEN', async () => {
      const { user } = await createUser({ role: 'user' });

      const response = await getPlan('2027', { as: user });

      expect(response.status).toBe(403);
      expect((response.body as ErrorBody).error.code).toBe('FORBIDDEN');
    });

    it.each(['guide', 'lead-guide', 'admin'] as const)(
      '[F2] a %s gets 200 with the plan',
      async (role) => {
        const { user } = await createUser({ role });

        const response = await getPlan('2027', { as: user });

        expect(response.status).toBe(200);
        expect((response.body as PlanBody).status).toBe('success');
        expect((response.body as PlanBody).data.plan).toEqual([]);
      },
    );
  });

  describe('the year and the query (F2, QA-17)', () => {
    it('[F2] a year of abc, 1999, 2101 or 2027.5 is a 400 VALIDATION_ERROR', async () => {
      const { user } = await createUser({ role: 'admin' });

      for (const year of ['abc', '1999', '2101', '2027.5']) {
        const response = await getPlan(year, { as: user });

        expect(response.status, year).toBe(400);
        expect((response.body as ErrorBody).error.code, year).toBe(
          'VALIDATION_ERROR',
        );
      }
    });

    it('[F2] a query parameter is a 400 VALIDATION_ERROR', async () => {
      const { user } = await createUser({ role: 'admin' });

      const response = await getPlan('2027', {
        as: user,
        path: '/api/v1/tours/monthly-plan/2027?month=2027-01',
      });

      expect(response.status).toBe(400);
      expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('the plan is grouped by IST month (F2, QA-10)', () => {
    it('[F2] a tour with a 1 January 2027 departure is listed under month 1 of 2027, and not under December of 2026', async () => {
      await createTour({
        slug: 'thar-desert-camel-safari',
        overrides: { startDates: [fromIstDay('2027-01-01')] },
      });
      const { user } = await createUser({ role: 'admin' });

      const plan2027 = (await getPlan('2027', { as: user })).body as PlanBody;
      const plan2026 = (await getPlan('2026', { as: user })).body as PlanBody;

      expect(plan2027.data.plan).toEqual([
        { month: 1, numTourStarts: 1, tours: ['Thar Desert Camel Safari'] },
      ]);
      expect(plan2026.data.plan.find((month) => month.month === 12)).toBe(
        undefined,
      );
    });

    it('[F2] two parallel calls for the same year return identical bodies', async () => {
      await createTour({
        slug: 'thar-desert-camel-safari',
        overrides: { startDates: [fromIstDay('2027-01-01')] },
      });
      const { user } = await createUser({ role: 'admin' });

      const [first, second] = await Promise.all([
        getPlan('2027', { as: user }),
        getPlan('2027', { as: user }),
      ]);

      expect(second.body).toEqual(first.body);
    });
  });
});
