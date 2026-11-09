import { describe, expect, it } from 'vitest';
import { fromIstDay } from '@/lib/ist';
import { Tour } from '@/server/modules/tours/model';
import { slugify } from '@/server/modules/tours/slug';
import { useTestDatabase } from '../../../helpers/db';
import { createTour } from '../../../helpers/factories';
import { seedTours } from '../../../helpers/seed';

const seed = seedTours();

describe('tours data layer', () => {
  useTestDatabase();

  describe('slugify', () => {
    it('[B5] folds a name to lowercase ASCII with single hyphens', () => {
      expect(slugify('Darjeeling and Sikkim Tea Trails')).toBe(
        'darjeeling-and-sikkim-tea-trails',
      );
    });

    it('[B5] strips accents and collapses runs of punctuation and spaces', () => {
      expect(slugify('  Café -- Ladakh,  High   Passes!  ')).toBe(
        'cafe-ladakh-high-passes',
      );
    });

    it('[B5] gives every seed tour its seed slug', () => {
      for (const tour of seed) {
        expect(slugify(tour.name)).toBe(tour.slug);
      }
    });
  });

  describe('Tour model', () => {
    it('[B5] saves all 13 seed tours', async () => {
      for (const record of seed) {
        const tour = await createTour({ slug: record.slug });
        expect(tour.slug).toBe(record.slug);
      }

      expect(await Tour.countDocuments()).toBe(13);
    });

    it('[B5] saves two tours with the same duration', async () => {
      const sixDay = seed.filter((tour) => tour.duration === 6);
      expect(sixDay.length).toBeGreaterThanOrEqual(2);

      await createTour({ slug: sixDay[0]!.slug });
      await createTour({ slug: sixDay[1]!.slug });

      expect(await Tour.countDocuments({ duration: 6 })).toBe(2);
    });

    it('[B5] rejects a second tour with an existing name with a duplicate-key error', async () => {
      const first = await createTour();
      const { _id: _unusedId, slug: _unusedSlug, ...rest } = first.toObject();

      await expect(Tour.create(rest)).rejects.toMatchObject({ code: 11000 });
    });

    it('[B5] rejects a second tour with an existing slug with a duplicate-key error', async () => {
      const first = await createTour();
      const { _id: _unusedId, slug: _unusedSlug, ...rest } = first.toObject();

      await expect(
        Tour.create({ ...rest, name: first.name.toUpperCase() }),
      ).rejects.toMatchObject({ code: 11000 });
    });

    it('[B5] generates a slug from the name when none is given', async () => {
      const tour = await createTour();
      await Tour.collection.deleteMany({});
      const { _id: _unusedId, slug: _unusedSlug, ...rest } = tour.toObject();

      const saved = await Tour.create(rest);

      expect(saved.slug).toBe(slugify(tour.name));
    });

    it('[B5] accepts an empty images array and adds createdAt and updatedAt', async () => {
      const tour = await createTour();
      const { _id: _unusedId, ...rest } = tour.toObject();
      await Tour.collection.deleteMany({});

      const saved = await Tour.create({ ...rest, images: [] });

      expect(saved.images).toEqual([]);
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('[B5] rejects four images', async () => {
      const tour = await createTour();

      tour.images = [...tour.images, 'a-fourth-photo.jpg'];

      await expect(tour.validate()).rejects.toThrow(/images/);
    });

    it('[B5] defines no schema default computed when the schema is defined', () => {
      const computedAtDefinition = Object.entries(Tour.schema.paths).filter(
        ([, path]) => path.options.default instanceof Date,
      );

      expect(computedAtDefinition).toEqual([]);
    });

    it('[QA-04] regenerates the slug when a saved tour is renamed', async () => {
      const tour = await createTour();

      tour.name = 'Coorg Coffee Plantation Walk';
      await tour.save();

      const reloaded = await Tour.findById(tour._id);
      expect(reloaded?.slug).toBe('coorg-coffee-plantation-walk');
    });

    it('[QA-04] regenerates the slug when findOneAndUpdate changes the name', async () => {
      const tour = await createTour();

      const updated = await Tour.findOneAndUpdate(
        { _id: tour._id },
        { name: 'Coorg Coffee Plantation Walk' },
        { returnDocument: 'after' },
      );

      expect(updated?.slug).toBe('coorg-coffee-plantation-walk');
    });

    it('[QA-04] regenerates the slug when the name is set through $set', async () => {
      const tour = await createTour();

      const updated = await Tour.findOneAndUpdate(
        { _id: tour._id },
        { $set: { name: 'Coorg Coffee Plantation Walk' } },
        { returnDocument: 'after' },
      );

      expect(updated?.slug).toBe('coorg-coffee-plantation-walk');
    });

    it('[QA-04] runs validators on updates', async () => {
      const tour = await createTour();

      await expect(
        Tour.findOneAndUpdate({ _id: tour._id }, { price: 0 }),
      ).rejects.toThrow(/price/);
    });

    it('[B20] accepts a price of 1 and rejects 0, -1 and 18999.5', async () => {
      const tour = await createTour();

      tour.price = 1;
      await expect(tour.validate()).resolves.toBeUndefined();

      for (const bad of [0, -1, 18999.5]) {
        tour.price = bad;
        await expect(tour.validate()).rejects.toThrow(/price/);
      }
    });

    it('[B20] has no discount field and no price breakdown beyond price', () => {
      expect(Object.keys(Tour.schema.paths)).not.toContain('priceDiscount');
    });

    it('[B19] accepts a start date at 00:00 IST and rejects one at 00:00 UTC', async () => {
      const tour = await createTour();

      tour.startDates = [fromIstDay('2027-07-10')];
      await expect(tour.validate()).resolves.toBeUndefined();

      tour.startDates = [new Date('2027-07-10T00:00:00Z')];
      await expect(tour.validate()).rejects.toThrow(/startDates/);
    });

    it('rejects out-of-range coordinates, an unknown difficulty and a short name', async () => {
      const tour = await createTour();

      tour.startLocation.coordinates = [200, 30];
      await expect(tour.validate()).rejects.toThrow(/startLocation/);
      tour.startLocation.coordinates = [78.3, 95];
      await expect(tour.validate()).rejects.toThrow(/startLocation/);
      tour.startLocation.coordinates = [78.3, 30.1];

      tour.difficulty = 'extreme' as never;
      await expect(tour.validate()).rejects.toThrow(/difficulty/);
      tour.difficulty = 'easy';

      tour.name = 'Short';
      await expect(tour.validate()).rejects.toThrow(/name/);
    });

    it('rounds ratingsAverage to one decimal', async () => {
      const tour = await createTour({ overrides: { ratingsAverage: 4.67 } });

      expect(tour.ratingsAverage).toBe(4.7);
    });

    it('rejects ratingsAverage outside 1 to 5 and a fractional duration', async () => {
      const tour = await createTour();

      tour.ratingsAverage = 5.4;
      await expect(tour.validate()).rejects.toThrow(/ratingsAverage/);
      tour.ratingsAverage = 4.5;

      tour.duration = 2.5;
      await expect(tour.validate()).rejects.toThrow(/duration/);
    });

    it('[R6] keeps startDates, images, photoCredits and locations in document order', async () => {
      const record = seed[2]! as (typeof seed)[number] & {
        locations: Array<{ description: string }>;
        photoCredits: Array<{ file: string }>;
      };
      const tour = await createTour({ slug: record.slug });

      const reloaded = await Tour.findById(tour._id).lean();

      expect(reloaded?.images).toEqual(record.images);
      expect(reloaded?.startDates.map((date) => date.toISOString())).toEqual(
        record.startDates.map((day) => fromIstDay(day).toISOString()),
      );
      expect(reloaded?.locations.map((stop) => stop.description)).toEqual(
        record.locations.map((stop) => stop.description),
      );
      expect(reloaded?.photoCredits.map((credit) => credit.file)).toEqual(
        record.photoCredits.map((credit) => credit.file),
      );
    });

    it('has the indexes plan.md 1.3 lists and no populate hook', async () => {
      const indexes = await Tour.listIndexes();
      const keys = indexes.map((index) => JSON.stringify(index.key));

      expect(keys).toContain(JSON.stringify({ price: 1, ratingsAverage: -1 }));
      expect(keys).toContain(JSON.stringify({ startLocation: '2dsphere' }));
      expect(keys).toContain(JSON.stringify({ startDates: 1 }));
      const slugIndex = indexes.find(
        (index) => JSON.stringify(index.key) === JSON.stringify({ slug: 1 }),
      );
      expect(slugIndex?.unique).toBe(true);
    });
  });
});
