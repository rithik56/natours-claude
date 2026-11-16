import { describe, expect, it } from 'vitest';
import * as listRoute from '@/app/api/v1/tours/route';
import * as top5Route from '@/app/api/v1/tours/top-5-cheap/route';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import { createTour } from '../../helpers/factories';
import { seedTours } from '../../helpers/seed';

type Top5Body = {
  status: string;
  data: { tours: Array<Record<string, unknown>> };
  meta: { page: number; limit: number; total: number };
};

type ErrorBody = { status: string; error: { code: string } };

// The five cheapest seed tours, by price: 12,999 to 19,999 (seed/data/tours.json).
const CHEAPEST_FIVE = [
  'Rishikesh Ganga Rafting',
  'Kedarkantha Winter Trek',
  'Thar Desert Camel Safari',
  'Valley of Flowers Trek',
  'Hampi Ruins and Boulders',
];

async function getTop5(path = ''): Promise<{ status: number; body: unknown }> {
  return callRoute(top5Route, { path: `/api/v1/tours/top-5-cheap${path}` });
}

function namesOf(body: Top5Body): string[] {
  return body.data.tours.map((tour) => String(tour.name));
}

describe('GET /api/v1/tours/top-5-cheap', () => {
  useTestDatabase();

  describe('the five cheapest tours (B2)', () => {
    it('[B2] returns the five cheapest seed tours in ascending price order', async () => {
      for (let index = 0; index < seedTours().length; index += 1) {
        await createTour();
      }

      const response = await getTop5();
      const body = response.body as Top5Body;

      expect(response.status).toBe(200);
      expect(body.status).toBe('success');
      expect(namesOf(body)).toEqual(CHEAPEST_FIVE);
      expect(body.meta).toEqual({ page: 1, limit: 5, total: 13 });
    });

    it('[B2] equal prices are ordered by rating descending, then name', async () => {
      // Three tours at 15,000: the two rated 4.9 come first, in name order; the 4.5 one comes last.
      await createTour({
        slug: 'andaman-island-explorer',
        overrides: { price: 15000, ratingsAverage: 4.5 },
      });
      await createTour({
        slug: 'thar-desert-camel-safari',
        overrides: { price: 15000, ratingsAverage: 4.9 },
      });
      await createTour({
        slug: 'kedarkantha-winter-trek',
        overrides: { price: 15000, ratingsAverage: 4.9 },
      });

      const body = (await getTop5()).body as Top5Body;

      expect(namesOf(body)).toEqual([
        'Kedarkantha Winter Trek',
        'Thar Desert Camel Safari',
        'Andaman Island Explorer',
      ]);
    });

    it('[B2] with fewer than five tours it returns all of them', async () => {
      for (let index = 0; index < 3; index += 1) {
        await createTour();
      }

      const body = (await getTop5()).body as Top5Body;

      expect(body.data.tours).toHaveLength(3);
      expect(body.meta.total).toBe(3);
    });

    it('[B2] with no tours it returns an empty list and a total of 0', async () => {
      const response = await getTop5();
      const body = response.body as Top5Body;

      expect(response.status).toBe(200);
      expect(body.data.tours).toEqual([]);
      expect(body.meta).toEqual({ page: 1, limit: 5, total: 0 });
    });

    it('[B2] its items equal the list endpoint for the same sort and a limit of 5', async () => {
      for (let index = 0; index < seedTours().length; index += 1) {
        await createTour();
      }

      const alias = (await getTop5()).body as Top5Body;
      const direct = (
        await callRoute(listRoute, {
          path: '/api/v1/tours?sort=price,-ratingsAverage&limit=5',
        })
      ).body as Top5Body;

      expect(alias.data.tours).toEqual(direct.data.tours);
    });
  });

  describe('the query is strict (B2, QA-17)', () => {
    it('[B2] ?limit=50 is a 400 VALIDATION_ERROR', async () => {
      const response = await getTop5('?limit=50');

      expect(response.status).toBe(400);
      expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
    });

    it('[B2] ?sort=-price is a 400 VALIDATION_ERROR', async () => {
      const response = await getTop5('?sort=-price');

      expect(response.status).toBe(400);
      expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
    });
  });
});
