import { afterEach, describe, expect, it, vi } from 'vitest';
import { list, monthOptions } from '@/server/modules/tours/service';
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

describe('tours service: list', () => {
  useTestDatabase();

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

    const error = await list(PAGE_ONE_QUERY).catch((caught: unknown) => caught);

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
