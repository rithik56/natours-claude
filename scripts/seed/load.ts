import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Types } from 'mongoose';
import { fromIstDay } from '@/lib/ist';

// Build-time reads of seed/ for `npm run seed`. The seed reads only seed/ and never test/ (ARC-03).
export const SEED_DIRECTORY = path.resolve(import.meta.dirname, '../../seed');

/** Photos are stored under this prefix, so a seed key never collides with a user upload (QA-03). */
export const PHOTO_KEY_PREFIX = 'tours/';

// The seed has no createdAt for tours, so each gets a fixed instant from its position in tours.json
// (2026-10-01 09:00 IST plus one minute per position). A re-run on another day then changes nothing,
// and the API's newest-first default order stays stable (RESEARCH Pattern 4).
const TOUR_CREATED_BASE_MS = Date.parse('2026-10-01T09:00:00+05:30');
const TOUR_CREATED_STEP_MS = 60_000;

type Point = { type: 'Point'; coordinates: [number, number] };

export type SeedTourRecord = {
  _id: string;
  name: string;
  slug: string;
  duration: number;
  maxGroupSize: number;
  difficulty: 'easy' | 'medium' | 'difficult';
  price: number;
  summary: string;
  description: string;
  imageCover: string;
  images: string[];
  startDates: string[];
  guides: string[];
  ratingsQuantity: number;
  ratingsAverage: number;
  startLocation: Point & { address: string; description: string };
  locations: Array<Point & { description: string; day: number }>;
  photoCredits: Array<{
    file: string;
    title: string;
    author: string;
    license: string;
    licenseUrl: string;
    sourceUrl: string;
    alt: string;
  }>;
};

export type SeedUserRecord = {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'guide' | 'lead-guide' | 'admin';
  active: boolean;
};

export type SeedReviewRecord = {
  _id: string;
  review: string;
  rating: number;
  tour: string;
  user: string;
  createdAt: string;
};

export type SeedBookingRecord = {
  _id: string;
  tour: string;
  user: string;
  price: number;
  currency: 'inr';
  startDate: string;
  status: 'paid' | 'refunded';
  createdAt: string;
};

function readSeed<T>(fileName: string): T[] {
  return JSON.parse(
    readFileSync(path.join(SEED_DIRECTORY, 'data', fileName), 'utf8'),
  ) as T[];
}

export function seedTourRecords(): SeedTourRecord[] {
  return readSeed<SeedTourRecord>('tours.json');
}

export function seedUserRecords(): SeedUserRecord[] {
  return readSeed<SeedUserRecord>('users.json');
}

export function seedReviewRecords(): SeedReviewRecord[] {
  return readSeed<SeedReviewRecord>('reviews.json');
}

export function seedBookingRecords(): SeedBookingRecord[] {
  return readSeed<SeedBookingRecord>('bookings.json');
}

const photoKey = (file: string): string => `${PHOTO_KEY_PREFIX}${file}`;

/** The 52 distinct photo file names, each credited in tours.json (the photo keys minus the prefix). */
export function listSeedPhotos(): string[] {
  const files = seedTourRecords().flatMap((tour) =>
    tour.photoCredits.map((credit) => credit.file),
  );
  return [...new Set(files)].sort();
}

/**
 * Maps one seed tour onto the Tour model: fixed _id, 00:00 IST start dates (B19),
 * storage keys with the tours/ prefix (QA-03), ObjectId guides and a fixed createdAt.
 */
export function toTourDocument(record: SeedTourRecord, index: number) {
  const { _id, startDates, guides, imageCover, images, photoCredits, ...rest } =
    record;
  return {
    ...rest,
    _id: new Types.ObjectId(_id),
    startDates: startDates.map(fromIstDay),
    imageCover: photoKey(imageCover),
    images: images.map(photoKey),
    photoCredits: photoCredits.map((credit) => ({
      ...credit,
      file: photoKey(credit.file),
    })),
    guides: guides.map((id) => new Types.ObjectId(id)),
    createdAt: new Date(TOUR_CREATED_BASE_MS + index * TOUR_CREATED_STEP_MS),
  };
}
