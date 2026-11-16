import { describe, expect, it } from 'vitest';
import * as route from '@/app/api/v1/tours/route';
import { fromIstDay } from '@/lib/ist';
import { list } from '@/server/modules/tours/service';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import { createTour } from '../../helpers/factories';
import { seedTours } from '../../helpers/seed';

type ListBody = {
  status: string;
  data: { tours: Array<Record<string, unknown>> };
  meta: { page: number; limit: number; total: number };
};

type ErrorBody = { status: string; error: { code: string } };

async function createWholeCatalogue(): Promise<void> {
  for (let index = 0; index < seedTours().length; index += 1) {
    await createTour();
  }
}

async function getList(path: string) {
  return callRoute(route, { path: `/api/v1/tours${path}` });
}

function namesOf(body: ListBody): string[] {
  return body.data.tours.map((tour) => String(tour.name));
}

describe('GET /api/v1/tours', () => {
  useTestDatabase();

  describe('the envelope and the shared list (B1, B11, B13)', () => {
    it('[B1] answers the tours under data.tours, with the page and total in meta', async () => {
      await createWholeCatalogue();

      const response = await getList('');
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

      const response = await getList('');
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

      const response = await getList('?page=2&limit=5');
      const body = response.body as ListBody;

      expect(body.meta).toEqual({ page: 2, limit: 5, total: 13 });
      expect(body.data.tours).toHaveLength(5);
    });
  });

  describe('filters, sort, paging and fields (S7, B1, B11, U10)', () => {
    it('[S7] no filter parameters returns every catalogue tour', async () => {
      await createWholeCatalogue();

      const body = (await getList('')).body as ListBody;

      expect(body.meta.total).toBe(13);
    });

    it('[S7] price[gte]=12999 includes the Rishikesh Ganga Rafting tour at exactly 12,999', async () => {
      await createWholeCatalogue();

      const response = await getList('?price[gte]=12999');

      expect(response.status).toBe(200);
      expect(namesOf(response.body as ListBody)).toContain(
        'Rishikesh Ganga Rafting',
      );
    });

    it('[S7] price[gt]=12999 excludes the Rishikesh Ganga Rafting tour at exactly 12,999', async () => {
      await createWholeCatalogue();

      const response = await getList('?price[gt]=12999');

      expect(namesOf(response.body as ListBody)).not.toContain(
        'Rishikesh Ganga Rafting',
      );
    });

    it('[S7] operator keys, unknown keys, a bad difficulty and __proto__ are each a 400 VALIDATION_ERROR', async () => {
      await createWholeCatalogue();

      for (const path of [
        '?price[$gt]=1',
        '?name=Ladakh',
        '?difficulty=hard',
        '?__proto__=x',
      ]) {
        const response = await getList(path);

        expect(response.status, path).toBe(400);
        expect((response.body as ErrorBody).error.code, path).toBe(
          'VALIDATION_ERROR',
        );
      }
    });

    it.each(['price', '-price', 'duration', '-duration', '-ratingsAverage'])(
      '[B1] sort %s: pages 1 and 2 at 12 hold each of the 13 tours exactly once',
      async (sort) => {
        await createWholeCatalogue();

        const first = (await getList(`?sort=${sort}&limit=12`))
          .body as ListBody;
        const second = (await getList(`?sort=${sort}&limit=12&page=2`))
          .body as ListBody;
        const names = [...namesOf(first), ...namesOf(second)];

        expect(names).toHaveLength(13);
        expect(new Set(names).size).toBe(13);
      },
    );

    it('[B1] an empty sort, a sort with the wrong case, a repeated field and six tokens are each a 400', async () => {
      await createWholeCatalogue();

      for (const path of [
        '?sort=',
        '?sort=Price',
        '?sort=price,-price',
        '?sort=price,-duration,ratingsAverage,-maxGroupSize,name,createdAt',
      ]) {
        const response = await getList(path);

        expect(response.status, path).toBe(400);
        expect((response.body as ErrorBody).error.code, path).toBe(
          'VALIDATION_ERROR',
        );
      }
    });

    it('[B11] limit 1 and limit 100 are accepted', async () => {
      await createWholeCatalogue();

      expect((await getList('?limit=1')).status).toBe(200);
      expect((await getList('?limit=100')).status).toBe(200);
    });

    it('[B11] page 0, limit 0, limit 101, page 1.5, limit 1e1 and page +2 are each a 400', async () => {
      await createWholeCatalogue();

      for (const path of [
        '?page=0',
        '?limit=0',
        '?limit=101',
        '?page=1.5',
        '?limit=1e1',
        '?page=%2B2',
      ]) {
        const response = await getList(path);

        expect(response.status, path).toBe(400);
        expect((response.body as ErrorBody).error.code, path).toBe(
          'VALIDATION_ERROR',
        );
      }
    });

    it('[B11] a page past the end answers an empty tours array with the real total', async () => {
      await createWholeCatalogue();

      const body = (await getList('?page=99')).body as ListBody;

      expect(body.data.tours).toEqual([]);
      expect(body.meta.total).toBe(13);
    });

    it('[B11] fields=name,price returns items with exactly id, name and price', async () => {
      await createWholeCatalogue();

      const body = (await getList('?fields=name,price&limit=3'))
        .body as ListBody;

      for (const tour of body.data.tours) {
        expect(Object.keys(tour).sort()).toEqual(['id', 'name', 'price']);
      }
    });

    it('[U10] month=2027-01 includes a tour with a 1 January departure, and month=2026-12 does not', async () => {
      await createTour({
        slug: 'thar-desert-camel-safari',
        overrides: { startDates: [fromIstDay('2027-01-01')] },
      });

      const january = (await getList('?month=2027-01')).body as ListBody;
      const december = (await getList('?month=2026-12')).body as ListBody;

      expect(namesOf(january)).toEqual(['Thar Desert Camel Safari']);
      expect(namesOf(december)).toEqual([]);
    });
  });
});
