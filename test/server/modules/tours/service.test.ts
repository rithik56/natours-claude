import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDeps } from '@/server/deps';
import { getBySlug, list, monthOptions } from '@/server/modules/tours/service';
import { Tour } from '@/server/modules/tours/model';
import { useTestDatabase } from '../../../helpers/db';
import { createTour } from '../../../helpers/factories';
import { seedTours } from '../../../helpers/seed';

// D-03 page 1 in the UI-SPEC order: rating first, then name. Kedarkantha (4.3) is last, so it opens page 2.
const PAGE_ONE = [
  'Andaman Island Explorer',
  'Kerala Backwaters and Hills',
  'Meghalaya Living Root Bridges',
  'Ranthambore Tiger Safari',
  'Darjeeling and Sikkim Tea Trails',
  'Golden Triangle Heritage',
  'Hampi Ruins and Boulders',
  'Ladakh High Passes',
  'Rishikesh Ganga Rafting',
  'Spiti Valley Star Gazer',
  'Thar Desert Camel Safari',
  'Valley of Flowers Trek',
];

const PAGE_ONE_QUERY = {
  sort: ['-ratingsAverage'],
  page: 1,
  limit: 12,
  clampPage: true,
};

async function createWholeCatalogue(): Promise<void> {
  for (let index = 0; index < seedTours().length; index += 1) {
    await createTour();
  }
}

// One database for the whole file: useTestDatabase is called once per file (test/helpers/db.ts).
describe('tours service', () => {
  useTestDatabase();

  describe('tours service: list', () => {
    it('[B12] lists every tour as a summary, with no guides or reviews in it', async () => {
      await createWholeCatalogue();

      const result = await list(PAGE_ONE_QUERY);

      expect(result.total).toBe(13);
      for (const item of result.items) {
        expect(item).not.toHaveProperty('guides');
        expect(item).not.toHaveProperty('reviews');
      }
    });

    it('[B11] page 1 holds the twelve tours in rating then name order (D-03)', async () => {
      await createWholeCatalogue();

      const result = await list(PAGE_ONE_QUERY);

      expect(result.items.map((tour) => tour.name)).toEqual(PAGE_ONE);
      expect(result.totalPages).toBe(2);
    });

    it('[B11] page 2 holds Kedarkantha Winter Trek', async () => {
      await createWholeCatalogue();

      const result = await list({ ...PAGE_ONE_QUERY, page: 2 });

      expect(result.items.map((tour) => tour.name)).toEqual([
        'Kedarkantha Winter Trek',
      ]);
      expect(result.page).toBe(2);
      expect(result.total).toBe(13);
    });

    it('[B11] on the page, a page past the end is clamped to the last page', async () => {
      await createWholeCatalogue();

      const result = await list({ ...PAGE_ONE_QUERY, page: 99 });

      expect(result.page).toBe(2);
      expect(result.items.map((tour) => tour.name)).toEqual([
        'Kedarkantha Winter Trek',
      ]);
    });

    it('[B11] with clampPage off, a page past the end is empty and keeps the real total', async () => {
      await createWholeCatalogue();

      const result = await list({
        ...PAGE_ONE_QUERY,
        page: 99,
        clampPage: false,
      });

      expect(result.items).toEqual([]);
      expect(result.page).toBe(99);
      expect(result.total).toBe(13);
    });

    it('[U10] monthOptions gives ascending, unique YYYY-MM months from the cached catalogue', async () => {
      await createWholeCatalogue();

      const options = await monthOptions();

      expect(options.length).toBeGreaterThan(0);
      expect(options.every((month) => /^\d{4}-\d{2}$/.test(month))).toBe(true);
      expect(options).toEqual([...new Set(options)].sort());
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('[B10] a read that fails with a network error is refused as SERVICE_UNAVAILABLE, with the driver error as the cause', async () => {
      const driverError = Object.assign(new Error('connection reset'), {
        name: 'MongoNetworkError',
      });
      vi.spyOn(Tour, 'find').mockImplementation(() => {
        throw driverError;
      });

      const error = await list(PAGE_ONE_QUERY).catch(
        (caught: unknown) => caught,
      );

      expect(error).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
      expect((error as Error).cause).toBe(driverError);
    });

    it('[B12] an empty catalogue lists nothing, with a total of 0 and one page', async () => {
      const result = await list(PAGE_ONE_QUERY);

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 1,
      });
    });
  });

  describe('tours service: getBySlug', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('[U11] returns the tour detail for a catalogue slug, with guide ids and no guide objects', async () => {
      const record = seedTours()[0]!;
      const tour = await createTour({ slug: record.slug, withGuides: true });

      const detail = await getBySlug(record.slug);

      expect(detail?.id).toBe(String(tour._id));
      expect(detail?.guideIds).toEqual(record.guides);
      expect(detail).not.toHaveProperty('guides');
    });

    it('[U11] returns null for a slug that no tour has', async () => {
      await createWholeCatalogue();

      expect(await getBySlug('does-not-exist')).toBeNull();
    });

    it('[T-04-17] an unknown slug creates no per-tour cache entry', async () => {
      await createWholeCatalogue();
      const cached = vi.spyOn(getDeps().cache, 'cached');

      await getBySlug('does-not-exist');

      const calls = cached.mock.calls as unknown as Array<[unknown, string[]]>;
      expect(
        calls.filter(([, keyParts]) => keyParts[0] === 'tour-detail'),
      ).toEqual([]);
    });

    it('[T-04-17] a known slug is read under its tour id, tagged tour:<id>', async () => {
      await createWholeCatalogue();
      const record = seedTours()[0]!;
      const stored = await Tour.findOne({ slug: record.slug })
        .select('_id')
        .lean();
      const cached = vi.spyOn(getDeps().cache, 'cached');

      await getBySlug(record.slug);

      const calls = cached.mock.calls as unknown as Array<
        [unknown, string[], string[]]
      >;
      const detailCall = calls.find(
        ([, keyParts]) => keyParts[0] === 'tour-detail',
      );
      expect(detailCall?.[1]).toEqual(['tour-detail', String(stored?._id)]);
      expect(detailCall?.[2]).toEqual([`tour:${String(stored?._id)}`]);
    });
  });
});
