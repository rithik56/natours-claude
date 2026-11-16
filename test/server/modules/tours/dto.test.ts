import { describe, expect, it } from 'vitest';
import {
  hasCover,
  toTourDetail,
  toTourSummary,
} from '@/server/modules/tours/dto';
import { Tour, type TourDoc } from '@/server/modules/tours/model';
import { useTestDatabase } from '../../../helpers/db';
import { createTour } from '../../../helpers/factories';
import { seedTours, seedUsers } from '../../../helpers/seed';

/** Removes every stored credit alt, so the fallback is tested whatever the seed holds. */
async function clearStoredAlts(tour: TourDoc): Promise<void> {
  await Tour.collection.updateOne(
    { _id: tour._id },
    { $unset: { 'photoCredits.$[].alt': '' } },
  );
}

const SUMMARY_KEYS = [
  'createdAt',
  'difficulty',
  'duration',
  'id',
  'imageCover',
  'maxGroupSize',
  'name',
  'price',
  'ratingsAverage',
  'ratingsQuantity',
  'slug',
  'startDates',
  'startLocation',
  'summary',
];

const DETAIL_KEYS = [
  ...SUMMARY_KEYS,
  'description',
  'guideIds',
  'images',
  'locations',
  'photoCredits',
].sort();

describe('tour DTOs', () => {
  useTestDatabase();

  it('[S3] toTourSummary returns exactly the documented keys', async () => {
    const tour = await createTour();

    const summary = toTourSummary(tour);

    expect(Object.keys(summary).sort()).toEqual(SUMMARY_KEYS);
    expect(Object.keys(summary.startLocation).sort()).toEqual([
      'address',
      'coordinates',
      'description',
    ]);
  });

  it('[S3] toTourSummary gives a string id and IST day strings for start dates', async () => {
    const record = seedTours()[0]!;
    const tour = await createTour({ slug: record.slug });

    const summary = toTourSummary(tour);

    expect(summary.id).toBe(record._id);
    expect(summary.startDates).toEqual(record.startDates);
    expect(summary.price).toBe(record.price);
  });

  it('[B1] toTourSummary gives createdAt as the ISO instant the document was created', async () => {
    const tour = await createTour();

    const summary = toTourSummary(tour);

    expect(summary.createdAt).toBe(tour.createdAt.toISOString());
  });

  it('[R6] toTourSummary keeps the order of startDates', async () => {
    const record = seedTours()[1]!;
    const later = [...record.startDates].reverse();
    const tour = await createTour({ slug: record.slug });
    tour.startDates = [...tour.startDates].reverse();

    const summary = toTourSummary(tour);

    expect(summary.startDates).toEqual(later);
  });

  it('[S3] toTourSummary works on a lean record and is JSON-stable', async () => {
    const tour = await createTour();
    const lean = await Tour.findById(tour._id).lean();

    const summary = toTourSummary(lean!);

    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
    expect(Array.isArray(summary.startLocation.coordinates)).toBe(true);
  });

  it('[B12] toTourDetail returns exactly the documented keys, with the guides as ids and no guide objects', async () => {
    const record = seedTours()[0]!;
    const tour = await createTour({ slug: record.slug, withGuides: true });

    const detail = toTourDetail(tour);

    expect(Object.keys(detail).sort()).toEqual(DETAIL_KEYS);
    expect(detail).not.toHaveProperty('guides');
    expect(detail.guideIds).toEqual(record.guides);
  });

  it('[B12] toTourDetail reads the guide ids of a populated tour too, in the tour order', async () => {
    const record = seedTours()[0]!;
    const tour = await createTour({ slug: record.slug, withGuides: true });
    const populated = await Tour.findById(tour._id).populate('guides');

    const detail = toTourDetail(populated!);

    expect(detail.guideIds).toEqual(record.guides);
    const names = seedUsers()
      .filter((person) => record.guides.includes(person._id))
      .map((person) => person.name);
    expect(names.length).toBe(record.guides.length);
  });

  it('[B12] toTourDetail gives [] guide ids for a tour with no guides', async () => {
    const tour = await createTour();
    tour.guides = [];

    const detail = toTourDetail(tour);

    expect(detail.guideIds).toEqual([]);
  });

  it('[R6] toTourDetail keeps the order of images, locations and photoCredits', async () => {
    const record = seedTours()[2]! as ReturnType<typeof seedTours>[number] & {
      locations: Array<{ description: string; day: number }>;
      photoCredits: Array<{ file: string }>;
    };
    const tour = await createTour({ slug: record.slug, withGuides: true });
    const populated = await Tour.findById(tour._id).populate('guides');

    const detail = toTourDetail(populated!);

    // QA-03: stored photo keys carry the tours/ prefix the seed writes.
    expect(detail.images).toEqual(record.images.map((file) => `tours/${file}`));
    expect(detail.locations.map((stop) => stop.description)).toEqual(
      record.locations.map((stop) => stop.description),
    );
    expect(detail.locations.map((stop) => stop.day)).toEqual(
      record.locations.map((stop) => stop.day),
    );
    expect(detail.photoCredits.map((credit) => credit.file)).toEqual(
      record.photoCredits.map((credit) => `tours/${credit.file}`),
    );
  });

  it('[U27] toTourDetail returns a stored photo credit alt unchanged', async () => {
    const tour = await createTour({ withGuides: true });
    const stored = 'Snow peaks above a glacial lake';
    tour.photoCredits[1]!.alt = stored;
    await tour.save();
    const populated = await Tour.findById(tour._id).populate('guides');

    const detail = toTourDetail(populated!);

    expect(detail.photoCredits[1]!.alt).toBe(stored);
  });

  it('[U27] toTourDetail gives the cover credit without alt the tour name', async () => {
    const tour = await createTour({ withGuides: true });
    await clearStoredAlts(tour);
    const populated = await Tour.findById(tour._id).populate('guides');

    const detail = toTourDetail(populated!);
    const cover = detail.photoCredits.find(
      (credit) => credit.file === detail.imageCover,
    );

    expect(cover?.alt).toBe(detail.name);
  });

  it('[U7] toTourDetail gives a gallery credit without alt its cleaned photo title', async () => {
    const tour = await createTour({ withGuides: true });
    const gallery = tour.photoCredits.find(
      (credit) => credit.file !== tour.imageCover,
    )!;
    gallery.title = 'Pangong_Tso VM.JPG';
    await tour.save();
    await clearStoredAlts(tour);
    const populated = await Tour.findById(tour._id).populate('guides');

    const detail = toTourDetail(populated!);
    const credit = detail.photoCredits.find(
      (entry) => entry.file === gallery.file,
    );

    expect(credit?.alt).toBe('Pangong Tso VM');
  });

  it('[S3] toTourDetail output is JSON-stable and carries no email', async () => {
    const tour = await createTour({ withGuides: true });

    const detail = toTourDetail(tour);

    expect(JSON.parse(JSON.stringify(detail))).toEqual(detail);
    expect(JSON.stringify(detail)).not.toContain('example.com');
  });
});

describe('hasCover (F6, D-13)', () => {
  it('[F6] is true only for an entry whose imageCover is a storage key', () => {
    expect(hasCover({ imageCover: 'tours/valley-of-flowers-trek-1.jpg' })).toBe(
      true,
    );
    expect(hasCover({ imageCover: null })).toBe(false);
  });
});
