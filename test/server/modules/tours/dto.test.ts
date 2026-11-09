import { describe, expect, it } from 'vitest';
import { toTourDetail, toTourSummary } from '@/server/modules/tours/dto';
import { Tour } from '@/server/modules/tours/model';
import { useTestDatabase } from '../../../helpers/db';
import { createTour } from '../../../helpers/factories';
import { seedTours, seedUsers } from '../../../helpers/seed';

const SUMMARY_KEYS = [
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
  'guides',
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

  it('[S3] toTourDetail returns exactly the documented keys with PublicUser guides', async () => {
    const record = seedTours()[0]!;
    const tour = await createTour({ slug: record.slug, withGuides: true });
    const populated = await Tour.findById(tour._id).populate('guides');

    const detail = toTourDetail(populated!);

    expect(Object.keys(detail).sort()).toEqual(DETAIL_KEYS);
    expect(detail.guides.map((guide) => guide.id)).toEqual(record.guides);
    for (const guide of detail.guides) {
      expect(Object.keys(guide).sort()).toEqual([
        'id',
        'name',
        'photo',
        'role',
      ]);
    }
    const names = seedUsers()
      .filter((person) => record.guides.includes(person._id))
      .map((person) => person.name);
    expect(detail.guides.map((guide) => guide.name).sort()).toEqual(
      names.sort(),
    );
  });

  it('[R6] toTourDetail keeps the order of images, locations and photoCredits', async () => {
    const record = seedTours()[2]! as ReturnType<typeof seedTours>[number] & {
      locations: Array<{ description: string; day: number }>;
      photoCredits: Array<{ file: string }>;
    };
    const tour = await createTour({ slug: record.slug, withGuides: true });
    const populated = await Tour.findById(tour._id).populate('guides');

    const detail = toTourDetail(populated!);

    expect(detail.images).toEqual(record.images);
    expect(detail.locations.map((stop) => stop.description)).toEqual(
      record.locations.map((stop) => stop.description),
    );
    expect(detail.locations.map((stop) => stop.day)).toEqual(
      record.locations.map((stop) => stop.day),
    );
    expect(detail.photoCredits.map((credit) => credit.file)).toEqual(
      record.photoCredits.map((credit) => credit.file),
    );
  });

  it('[S3] toTourDetail throws when guides are not populated', async () => {
    const tour = await createTour();

    expect(() => toTourDetail(tour)).toThrow(/guides/);
  });

  it('[S3] toTourDetail output is JSON-stable and carries no email', async () => {
    const tour = await createTour({ withGuides: true });
    const populated = await Tour.findById(tour._id).populate('guides');

    const detail = toTourDetail(populated!);

    expect(JSON.parse(JSON.stringify(detail))).toEqual(detail);
    expect(JSON.stringify(detail)).not.toContain('example.com');
  });
});
