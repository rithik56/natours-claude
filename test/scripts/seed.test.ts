import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { toIstDay } from '@/lib/ist';
import { parseSeedArgs } from '../../scripts/seed.ts';
import {
  seedBookingRecords,
  seedReviewRecords,
  seedTourRecords,
  seedUserRecords,
} from '../../scripts/seed/load.ts';
import {
  assertSeedAllowed,
  readSeedPasswords,
  runSeed,
} from '../../scripts/seed/run.ts';
import { useTestDatabase } from '../helpers/db';
import { fakes } from '../helpers/fakes';
import { Booking } from '@/server/modules/bookings/model';
import { Review } from '@/server/modules/reviews/model';
import { Tour } from '@/server/modules/tours/model';
import { User } from '@/server/modules/users/model';

// Test-only passwords. They are never shown to a person and never committed as configuration.
const PASSWORDS = {
  user: 'seed-test-traveller-pass',
  admin: 'seed-test-admin-passphrase-2026',
};

// Pins the date roll so every database test is stable on any day it runs (ADR 0023).
const TODAY = '2026-11-08';

/** The four seed collections as stored, with password hashes, timestamps and every field. */
async function snapshot(): Promise<Record<string, unknown[]>> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('no database connection');
  const collections: Record<string, unknown[]> = {};
  for (const name of ['tours', 'users', 'reviews', 'bookings']) {
    collections[name] = await db
      .collection(name)
      .find({})
      .sort({ _id: 1 })
      .toArray();
  }
  return collections;
}

describe('parseSeedArgs', () => {
  it('[D10] defaults to no reset and no --today', () => {
    expect(parseSeedArgs([])).toEqual({ reset: false, today: undefined });
  });

  it('[D10] reads --reset', () => {
    expect(parseSeedArgs(['--reset']).reset).toBe(true);
  });

  it('[D10] reads a valid --today day', () => {
    expect(parseSeedArgs(['--today=2026-11-08']).today).toBe('2026-11-08');
  });

  it('[D10] refuses a --today that is not a real calendar day, and names the flag', () => {
    expect(() => parseSeedArgs(['--today=2026-02-30'])).toThrow(/--today/);
  });

  it('[D10] refuses an unknown flag and names it', () => {
    expect(() => parseSeedArgs(['--bogus'])).toThrow(/--bogus/);
  });
});

describe('assertSeedAllowed', () => {
  it('[D10] (SEC-16) refuses production before any connection', () => {
    expect(() =>
      assertSeedAllowed({ appEnv: 'production', reset: false }),
    ).toThrow(/APP_ENV/);
  });

  it.each(['development', 'test', 'ci', 'staging'])(
    '[D10] allows a plain seed in %s',
    (appEnv) => {
      expect(() => assertSeedAllowed({ appEnv, reset: false })).not.toThrow();
    },
  );

  it.each(['development', 'test', 'ci'])(
    '[D10] (SEC-16) allows --reset in %s',
    (appEnv) => {
      expect(() => assertSeedAllowed({ appEnv, reset: true })).not.toThrow();
    },
  );

  it('[D10] (SEC-16) refuses --reset in staging', () => {
    expect(() => assertSeedAllowed({ appEnv: 'staging', reset: true })).toThrow(
      /--reset/,
    );
  });
});

describe('readSeedPasswords', () => {
  it('[D10] (SEC-27) reads both passwords from the configuration', () => {
    expect(
      readSeedPasswords({
        SEED_USER_PASSWORD: 'seed-user-pass-0123',
        SEED_ADMIN_PASSWORD: 'seed-admin-passphrase-0123',
      }),
    ).toEqual({
      user: 'seed-user-pass-0123',
      admin: 'seed-admin-passphrase-0123',
    });
  });

  it('[D10] (SEC-27) a missing user password stops the seed and names the key', () => {
    expect(() =>
      readSeedPasswords({ SEED_ADMIN_PASSWORD: 'seed-admin-passphrase-0123' }),
    ).toThrow(/SEED_USER_PASSWORD/);
  });

  it('[D10] (SEC-27) a missing admin password stops the seed and names the key', () => {
    expect(() =>
      readSeedPasswords({ SEED_USER_PASSWORD: 'seed-user-pass-0123' }),
    ).toThrow(/SEED_ADMIN_PASSWORD/);
  });

  it('[D10] (SEC-27) an admin password under 16 characters is refused, and its value is never shown', () => {
    const short = 'too-short-42';
    let message = '';
    try {
      readSeedPasswords({
        SEED_USER_PASSWORD: 'seed-user-pass-0123',
        SEED_ADMIN_PASSWORD: short,
      });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toMatch(/SEED_ADMIN_PASSWORD/);
    expect(message).not.toContain(short);
  });
});

describe('runSeed photos and tours', () => {
  useTestDatabase();

  it('[D10] loads 13 tours, 35 users, 52 reviews, 58 bookings and stores 52 photos', async () => {
    const counts = await runSeed({
      reset: false,
      passwords: PASSWORDS,
      today: TODAY,
    });
    expect(counts).toEqual({
      tours: 13,
      users: 35,
      reviews: 52,
      bookings: 58,
      photos: 52,
    });
    expect(fakes.storage.files.size).toBe(52);
  });

  it('[D2] uploads the 52 seed photos under tours/<file> as image/jpeg', async () => {
    await runSeed({ reset: false, passwords: PASSWORDS, today: TODAY });
    for (const [key, file] of fakes.storage.files) {
      expect(key.startsWith('tours/')).toBe(true);
      expect(file.contentType).toBe('image/jpeg');
    }
  });

  it('[D2] every tour cover is a key the storage holds', async () => {
    await runSeed({ reset: false, passwords: PASSWORDS, today: TODAY });
    const tours = await Tour.find().lean();
    for (const tour of tours) {
      expect(tour.imageCover).toEqual(expect.any(String));
      expect(fakes.storage.files.has(tour.imageCover as string)).toBe(true);
    }
  });

  it('[D10] a second run changes nothing: every document of the four collections is deep-equal, passwords and timestamps included', async () => {
    await runSeed({ reset: false, passwords: PASSWORDS, today: TODAY });
    const before = await snapshot();
    await runSeed({ reset: false, passwords: PASSWORDS, today: TODAY });
    expect(await snapshot()).toEqual(before);
  });

  it('[D10] --reset rebuilds the seed after a tour is deleted, with the same tours, reviews and bookings', async () => {
    await runSeed({ reset: false, passwords: PASSWORDS, today: TODAY });
    const before = await snapshot();
    await Tour.deleteOne({ slug: 'valley-of-flowers-trek' });

    await runSeed({ reset: true, passwords: PASSWORDS, today: TODAY });

    const after = await snapshot();
    expect(after.tours).toEqual(before.tours);
    expect(after.reviews).toEqual(before.reviews);
    expect(after.bookings).toEqual(before.bookings);
    expect(after.users).toHaveLength(35);
  });

  it('[D10] keeps each review and booking createdAt equal to its seed value', async () => {
    await runSeed({ reset: false, passwords: PASSWORDS, today: TODAY });
    const [review] = seedReviewRecords();
    const [booking] = seedBookingRecords();
    expect(review).toBeDefined();
    expect(booking).toBeDefined();
    const storedReview = await Review.findById(review?._id).lean();
    const storedBooking = await Booking.findById(booking?._id).lean();
    expect(storedReview?.createdAt).toEqual(new Date(review?.createdAt ?? ''));
    expect(storedBooking?.createdAt).toEqual(
      new Date(booking?.createdAt ?? ''),
    );
  });

  it('[D10] stores every user with the seed role and an email on the example.com domain', async () => {
    await runSeed({ reset: false, passwords: PASSWORDS, today: TODAY });
    const seeded = seedUserRecords();
    const stored = await User.find().select('+active').lean();
    expect(stored).toHaveLength(seeded.length);
    for (const person of seeded) {
      const row = stored.find((entry) => String(entry._id) === person._id);
      expect(row?.role).toBe(person.role);
      expect(row?.email.endsWith('@example.com')).toBe(true);
    }
  });

  it('[QA-18] builds the 2dsphere index and the unique indexes after a seed', async () => {
    await runSeed({ reset: false, passwords: PASSWORDS, today: TODAY });
    const tourIndexes = await Tour.collection.indexes();
    const userIndexes = await User.collection.indexes();
    expect(
      tourIndexes.some((index) => index.key.startLocation === '2dsphere'),
    ).toBe(true);
    expect(
      userIndexes.some((index) => index.key.email === 1 && index.unique),
    ).toBe(true);
    expect(seedTourRecords()).toHaveLength(13);
  });

  it('[D10] with --today 2026-11-08 stores every seed start date unchanged', async () => {
    await runSeed({ reset: false, passwords: PASSWORDS, today: TODAY });
    const stored = await Tour.find().lean();
    for (const record of seedTourRecords()) {
      const tour = stored.find((entry) => entry.slug === record.slug);
      expect(tour?.startDates.map((day) => toIstDay(day))).toEqual(
        record.startDates,
      );
    }
  });

  it('[D10] with --today 2027-12-01 stores only the passed Golden Triangle dates rolled, ascending, with the Friday rule applied', async () => {
    await runSeed({ reset: false, passwords: PASSWORDS, today: '2027-12-01' });
    const goldenTriangle = await Tour.findOne({
      slug: 'golden-triangle-heritage',
    }).lean();
    expect(goldenTriangle?.startDates.map((day) => toIstDay(day))).toEqual([
      '2028-01-30',
      '2028-03-06',
      '2028-11-27',
    ]);
  });

  it('[D10] bookings and reviews never move: each startDate and createdAt equals the seed value after a roll', async () => {
    await runSeed({ reset: false, passwords: PASSWORDS, today: '2027-12-01' });
    for (const record of seedBookingRecords()) {
      const stored = await Booking.findById(record._id).lean();
      expect(toIstDay(stored?.startDate ?? new Date(0))).toBe(record.startDate);
      expect(stored?.createdAt).toEqual(new Date(record.createdAt));
    }
    for (const record of seedReviewRecords()) {
      const stored = await Review.findById(record._id).lean();
      expect(stored?.createdAt).toEqual(new Date(record.createdAt));
    }
  });
});
