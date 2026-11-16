import { describe, expect, it } from 'vitest';
import * as route from '@/app/api/v1/tours/stats/route';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import { createTour } from '../../helpers/factories';
import { seedTours } from '../../helpers/seed';

type StatsBody = {
  status: string;
  data: { stats: Array<Record<string, unknown>> };
};

type ErrorBody = { status: string; error: { code: string } };

// The seed rows, one per difficulty (seed/data/tours.json, rounded as stats.ts rounds them).
const SEED_STATS = [
  {
    difficulty: 'easy',
    numTours: 6,
    numRatings: 24,
    avgRating: 4.7,
    avgPrice: 27999,
    minPrice: 16999,
    maxPrice: 38999,
  },
  {
    difficulty: 'medium',
    numTours: 5,
    numRatings: 20,
    avgRating: 4.5,
    avgPrice: 19999,
    minPrice: 12999,
    maxPrice: 32999,
  },
  {
    difficulty: 'difficult',
    numTours: 2,
    numRatings: 8,
    avgRating: 4.7,
    avgPrice: 35499,
    minPrice: 27999,
    maxPrice: 42999,
  },
];

async function createWholeCatalogue(): Promise<void> {
  for (let index = 0; index < seedTours().length; index += 1) {
    await createTour();
  }
}

async function getStats(path = '') {
  return callRoute(route, { path: `/api/v1/tours/stats${path}` });
}

describe('GET /api/v1/tours/stats', () => {
  useTestDatabase();

  it('[F1] is public: an anonymous caller gets one row per difficulty, in order', async () => {
    await createWholeCatalogue();

    const response = await getStats();
    const body = response.body as StatsBody;

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.stats).toEqual(SEED_STATS);
  });

  it('[F1] two parallel calls on the same data return identical bodies', async () => {
    await createWholeCatalogue();

    const [first, second] = await Promise.all([getStats(), getStats()]);

    expect(second.body).toEqual(first.body);
  });

  it('[F1] an empty catalogue gives an empty stats list', async () => {
    const response = await getStats();

    expect(response.status).toBe(200);
    expect((response.body as StatsBody).data.stats).toEqual([]);
  });

  it('[F1] the query is strict: a parameter such as ?sort=price is a 400 VALIDATION_ERROR', async () => {
    await createWholeCatalogue();

    const response = await getStats('?sort=price');

    expect(response.status).toBe(400);
    expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
  });
});
