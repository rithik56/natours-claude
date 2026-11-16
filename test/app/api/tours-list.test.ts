import { describe, expect, it } from 'vitest';
import * as route from '@/app/api/v1/tours/route';
import { list } from '@/server/modules/tours/service';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import { createTour } from '../../helpers/factories';
import { seedTours } from '../../helpers/seed';

type ListBody = {
  status: string;
  data: { tours: unknown[] };
  meta: { page: number; limit: number; total: number };
};

async function createWholeCatalogue(): Promise<void> {
  for (let index = 0; index < seedTours().length; index += 1) {
    await createTour();
  }
}

describe('GET /api/v1/tours', () => {
  useTestDatabase();

  it('[B1] answers the tours under data.tours, with the page and total in meta', async () => {
    await createWholeCatalogue();

    const response = await callRoute(route, { path: '/api/v1/tours' });
    const body = response.body as ListBody;

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data.tours)).toBe(true);
    expect(typeof body.meta.total).toBe('number');
    expect(body.meta.total).toBe(13);
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(20);
  });

  it('[B13] the route returns the same items as list() for the same query', async () => {
    await createWholeCatalogue();

    const response = await callRoute(route, { path: '/api/v1/tours' });
    const direct = await list({
      sort: ['-createdAt'],
      page: 1,
      limit: 20,
      clampPage: false,
    });

    expect((response.body as ListBody).data.tours).toEqual(
      JSON.parse(JSON.stringify(direct.items)),
    );
  });

  it('[B11] reads page and limit from the query string', async () => {
    await createWholeCatalogue();

    const response = await callRoute(route, {
      path: '/api/v1/tours?page=2&limit=5',
    });
    const body = response.body as ListBody;

    expect(body.meta).toEqual({ page: 2, limit: 5, total: 13 });
    expect(body.data.tours).toHaveLength(5);
  });
});
