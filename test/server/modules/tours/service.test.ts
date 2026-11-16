import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromIstDay } from '@/lib/ist';
import { getDeps } from '@/server/deps';
import {
  distancesFrom,
  getById,
  getBySlug,
  getGuides,
  getMonthlyPlan,
  getStats,
  list,
  monthOptions,
  toursWithin,
} from '@/server/modules/tours/service';
import { Tour } from '@/server/modules/tours/model';
import { User } from '@/server/modules/users/model';
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

  describe('tours service: getGuides and getById', () => {
    // Valley of Flowers Trek: Gaurav Bisht is its lead guide, Rohit Rawat a guide (seed/data/users.json).
    const VALLEY = 'valley-of-flowers-trek';

    it('[B12] puts the lead guide first, even when the tour lists him second', async () => {
      await createTour({ slug: VALLEY, withGuides: true });
      const [lead, guide] = seedTours().find((tour) => tour.slug === VALLEY)!
        .guides as [string, string];
      const tour = await Tour.findOne({ slug: VALLEY }).select('_id').lean();

      const people = await getGuides(String(tour?._id), [guide, lead]);

      expect(people.map((person) => person.id)).toEqual([lead, guide]);
      expect(people[0]!.role).toBe('lead-guide');
    });

    it('[B12] two guides with the same role keep the order of the tour guides array', async () => {
      await createTour({ slug: VALLEY, withGuides: true });
      const [first, second] = seedTours().find((tour) => tour.slug === VALLEY)!
        .guides as [string, string];
      await User.collection.updateMany(
        { _id: { $in: [first, second].map((id) => new Types.ObjectId(id)) } },
        { $set: { role: 'guide' } },
      );
      const tour = await Tour.findOne({ slug: VALLEY }).select('_id').lean();

      const people = await getGuides(String(tour?._id), [second, first]);

      expect(people.map((person) => person.id)).toEqual([second, first]);
    });

    it('[B12] a deactivated guide is left out, and the rest stay in order', async () => {
      await createTour({ slug: VALLEY, withGuides: true });
      const [lead, guide] = seedTours().find((tour) => tour.slug === VALLEY)!
        .guides as [string, string];
      await User.collection.updateOne(
        { _id: new Types.ObjectId(guide) },
        { $set: { active: false } },
      );
      const tour = await Tour.findOne({ slug: VALLEY }).select('_id').lean();

      const people = await getGuides(String(tour?._id), [lead, guide]);

      expect(people.map((person) => person.id)).toEqual([lead]);
    });

    it('[B12] a guide removed from the database is left out, and the rest stay in order', async () => {
      await createTour({ slug: VALLEY, withGuides: true });
      const [lead, guide] = seedTours().find((tour) => tour.slug === VALLEY)!
        .guides as [string, string];
      await User.deleteOne({ _id: guide });
      const tour = await Tour.findOne({ slug: VALLEY }).select('_id').lean();

      const people = await getGuides(String(tour?._id), [lead, guide]);

      expect(people.map((person) => person.id)).toEqual([lead]);
    });

    it('[B12] a tour whose guides are all missing gets [] and never throws', async () => {
      await createTour({ slug: VALLEY });
      const tour = await Tour.findOne({ slug: VALLEY }).select('_id').lean();
      const seeded = seedTours().find((entry) => entry.slug === VALLEY)!;

      const people = await getGuides(String(tour?._id), seeded.guides);

      expect(people).toEqual([]);
    });

    it('[S3] a guide carries only id, name, photo and role', async () => {
      await createTour({ slug: VALLEY, withGuides: true });
      const seeded = seedTours().find((entry) => entry.slug === VALLEY)!;
      const tour = await Tour.findOne({ slug: VALLEY }).select('_id').lean();

      const people = await getGuides(String(tour?._id), seeded.guides);

      for (const person of people) {
        expect(Object.keys(person).sort()).toEqual([
          'id',
          'name',
          'photo',
          'role',
        ]);
      }
    });

    it('[B12] getById returns the tour without guides and with its guide ids in order', async () => {
      await createTour({ slug: VALLEY, withGuides: true });
      const seeded = seedTours().find((entry) => entry.slug === VALLEY)!;
      const tour = await Tour.findOne({ slug: VALLEY }).select('_id').lean();

      const detail = await getById(String(tour?._id));

      expect(detail.id).toBe(String(tour?._id));
      expect(detail.guideIds).toEqual(seeded.guides);
      expect(detail).not.toHaveProperty('guides');
    });

    it('[B12] getById refuses an unknown id as NOT_FOUND, and a malformed id the same way', async () => {
      const unknown = await getById('0123456789abcdef01234567').catch(
        (error: unknown) => error,
      );
      const malformed = await getById('not-an-id').catch(
        (error: unknown) => error,
      );

      expect(unknown).toMatchObject({ code: 'NOT_FOUND' });
      expect(malformed).toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('tours service: getStats and getMonthlyPlan (F1, F2)', () => {
    it('[F1] getStats gives the seed rows, computed from the cached catalogue', async () => {
      await createWholeCatalogue();

      const rows = await getStats();

      expect(rows.map((row) => row.difficulty)).toEqual([
        'easy',
        'medium',
        'difficult',
      ]);
      expect(rows[0]).toEqual({
        difficulty: 'easy',
        numTours: 6,
        numRatings: 24,
        avgRating: 4.7,
        avgPrice: 27999,
        minPrice: 16999,
        maxPrice: 38999,
      });
    });

    it('[F1] two parallel getStats calls return identical rows', async () => {
      await createWholeCatalogue();

      const [first, second] = await Promise.all([getStats(), getStats()]);

      expect(second).toEqual(first);
    });

    it('[F2] getMonthlyPlan groups the seed 2027 starts by IST month, in month order', async () => {
      await createWholeCatalogue();

      const plan = await getMonthlyPlan(2027);

      expect(plan.map((month) => month.month)).toEqual([
        1, 2, 3, 4, 6, 7, 8, 9, 10,
      ]);
      expect(plan.map((month) => month.numTourStarts)).toEqual([
        6, 5, 4, 4, 2, 3, 2, 2, 1,
      ]);
    });

    it('[F2] a 1 January 2027 departure is in January of the 2027 plan, and not in the 2026 plan', async () => {
      await createTour({
        slug: 'thar-desert-camel-safari',
        overrides: { startDates: [fromIstDay('2027-01-01')] },
      });

      expect(await getMonthlyPlan(2027)).toEqual([
        { month: 1, numTourStarts: 1, tours: ['Thar Desert Camel Safari'] },
      ]);
      expect(await getMonthlyPlan(2026)).toEqual([]);
    });

    it('[F2] a tour with two starts in one month counts both and lists its name once', async () => {
      await createTour({
        slug: 'thar-desert-camel-safari',
        overrides: {
          startDates: [fromIstDay('2027-01-03'), fromIstDay('2027-01-20')],
        },
      });

      expect(await getMonthlyPlan(2027)).toEqual([
        { month: 1, numTourStarts: 2, tours: ['Thar Desert Camel Safari'] },
      ]);
    });

    it('[F2] two parallel getMonthlyPlan calls return identical plans', async () => {
      await createWholeCatalogue();

      const [first, second] = await Promise.all([
        getMonthlyPlan(2027),
        getMonthlyPlan(2027),
      ]);

      expect(second).toEqual(first);
    });

    it('[B10] a failed plan read is refused as SERVICE_UNAVAILABLE, with the driver error as the cause', async () => {
      const driverError = Object.assign(new Error('connection reset'), {
        name: 'MongoNetworkError',
      });
      vi.spyOn(Tour, 'aggregate').mockImplementation(() => {
        throw driverError;
      });

      const error = await getMonthlyPlan(2027).catch(
        (caught: unknown) => caught,
      );

      expect(error).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
      expect((error as Error).cause).toBe(driverError);
    });
  });

  describe('tours service: toursWithin and distancesFrom (B3)', () => {
    // Connaught Place, Delhi, in the order the API takes them (lat, lng).
    const DELHI = { lat: 28.6139, lng: 77.209 };

    // The DB-down test replaces Tour.find, which createTour also calls, so restore it after each test.
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('[B3] the startLocation 2dsphere index exists, which $geoNear needs (QA-18)', async () => {
      const indexes = await Tour.collection.indexes();

      expect(indexes.map((index) => index.key)).toContainEqual({
        startLocation: '2dsphere',
      });
    });

    it('[B3] toursWithin returns the seed tours whose start lies inside 300 km, as summaries, by name', async () => {
      await createWholeCatalogue();

      const tours = await toursWithin({ ...DELHI, distance: 300, unit: 'km' });

      expect(tours.map((tour) => tour.name)).toEqual([
        'Golden Triangle Heritage',
        'Kedarkantha Winter Trek',
        'Rishikesh Ganga Rafting',
        'Valley of Flowers Trek',
      ]);
      for (const tour of tours) {
        expect(tour).not.toHaveProperty('guides');
        expect(tour).toHaveProperty('startDates');
      }
    });

    it('[B3] a radius that contains no start location gives []', async () => {
      await createWholeCatalogue();

      expect(
        await toursWithin({ lat: 0, lng: 80, distance: 1, unit: 'km' }),
      ).toEqual([]);
    });

    it('[B3] toursWithin refuses a failed read as SERVICE_UNAVAILABLE', async () => {
      const driverError = Object.assign(new Error('connection reset'), {
        name: 'MongoNetworkError',
      });
      vi.spyOn(Tour, 'find').mockImplementation(() => {
        throw driverError;
      });

      const error = await toursWithin({
        ...DELHI,
        distance: 300,
        unit: 'km',
      }).catch((caught: unknown) => caught);

      expect(error).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    });

    it('[B3] distancesFrom gives all 13 tours, nearest first, with Golden Triangle Heritage at about 4.7 km', async () => {
      await createWholeCatalogue();

      const distances = await distancesFrom({ ...DELHI, unit: 'km' });

      expect(distances).toHaveLength(13);
      expect(distances[0]?.name).toBe('Golden Triangle Heritage');
      expect(distances[0]?.distance).toBeCloseTo(4.7, 1);
      const values = distances.map((entry) => entry.distance);
      expect(values).toEqual([...values].sort((a, b) => a - b));
    });

    it('[B3] distancesFrom rounds each distance to 2 decimals and returns only id, name, slug and distance', async () => {
      await createWholeCatalogue();

      const distances = await distancesFrom({ ...DELHI, unit: 'km' });

      for (const entry of distances) {
        expect(Math.round(entry.distance * 100) / 100).toBe(entry.distance);
        expect(Object.keys(entry).sort()).toEqual([
          'distance',
          'id',
          'name',
          'slug',
        ]);
      }
    });

    it('[B3] distancesFrom in miles converts the kilometre distances', async () => {
      await createWholeCatalogue();

      const km = await distancesFrom({ ...DELHI, unit: 'km' });
      const mi = await distancesFrom({ ...DELHI, unit: 'mi' });

      expect(mi[0]?.name).toBe('Golden Triangle Heritage');
      expect(mi[0]?.distance).toBeCloseTo((km[0]?.distance ?? 0) * 0.621371, 1);
    });
  });
});
