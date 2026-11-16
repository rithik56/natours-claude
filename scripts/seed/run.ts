import { readFileSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { fromIstDay } from '@/lib/ist';
import { getConfig } from '@/server/config';
import { connectDb } from '@/server/db';
import { getDeps } from '@/server/deps';
import { Booking } from '@/server/modules/bookings/model';
import { Review } from '@/server/modules/reviews/model';
import { Tour } from '@/server/modules/tours/model';
import { User } from '@/server/modules/users/model';
import {
  listSeedPhotos,
  PHOTO_KEY_PREFIX,
  SEED_DIRECTORY,
  seedBookingRecords,
  seedReviewRecords,
  seedTourRecords,
  seedUserRecords,
  toTourDocument,
} from './load';

// SEC-16: the seed runs only where it is meant to. The check reads APP_ENV, never NODE_ENV (ARC-10).
const SEED_APP_ENVS: readonly string[] = [
  'development',
  'test',
  'ci',
  'staging',
];
const RESET_APP_ENVS: readonly string[] = ['development', 'test', 'ci'];

// SEC-27: the admin's seed password is at least 16 characters. The user's must pass the User model's own minimum.
const MIN_ADMIN_PASSWORD_LENGTH = 16;
const MIN_USER_PASSWORD_LENGTH = 8;

export type SeedPasswords = { user: string; admin: string };

export type SeedCounts = {
  tours: number;
  users: number;
  reviews: number;
  bookings: number;
  photos: number;
};

/** Throws before any connection unless this APP_ENV may be seeded, and `reset` only where it may be wiped. */
export function assertSeedAllowed({
  appEnv,
  reset,
}: {
  appEnv: string;
  reset: boolean;
}): void {
  if (!SEED_APP_ENVS.includes(appEnv)) {
    throw new Error(
      `the seed runs only when APP_ENV is development, test, ci or staging, not ${appEnv}`,
    );
  }
  if (reset && !RESET_APP_ENVS.includes(appEnv)) {
    throw new Error('--reset runs only when APP_ENV is development, test or ci');
  }
}

/**
 * Reads the two seed passwords from the configuration (SEC-27). A missing or short value throws a
 * message that names the key and never its value, so the password cannot reach a log.
 */
export function readSeedPasswords(config: {
  SEED_USER_PASSWORD?: string;
  SEED_ADMIN_PASSWORD?: string;
}): SeedPasswords {
  const user = config.SEED_USER_PASSWORD;
  const admin = config.SEED_ADMIN_PASSWORD;
  if (user === undefined || user === '') {
    throw new Error('SEED_USER_PASSWORD is required for the seed (SEC-27)');
  }
  if (admin === undefined || admin === '') {
    throw new Error('SEED_ADMIN_PASSWORD is required for the seed (SEC-27)');
  }
  if ([...admin].length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters (SEC-27)`,
    );
  }
  if ([...user].length < MIN_USER_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_USER_PASSWORD must be at least ${MIN_USER_PASSWORD_LENGTH} characters`,
    );
  }
  return { user, admin };
}

/** Every field but _id, which never changes once the document exists. */
function withoutId<T extends { _id: unknown }>(doc: T): Omit<T, '_id'> {
  return Object.fromEntries(
    Object.entries(doc).filter(([key]) => key !== '_id'),
  ) as Omit<T, '_id'>;
}

// D10: the upload goes through the same storage adapter the app reads, so `/media` serves the bytes (D2).
async function uploadPhotos(): Promise<void> {
  const { storage } = getDeps();
  for (const file of listSeedPhotos()) {
    const bytes = readFileSync(path.join(SEED_DIRECTORY, 'img', 'tours', file));
    await storage.put(`${PHOTO_KEY_PREFIX}${file}`, bytes, 'image/jpeg');
  }
}

// Reset deletes every seed document and every seed photo, so the load below rebuilds exactly the seed.
async function resetSeed(): Promise<void> {
  await Promise.all([
    Booking.deleteMany({}),
    Review.deleteMany({}),
    Tour.deleteMany({}),
    User.deleteMany({}),
  ]);
  const { storage } = getDeps();
  for (const file of listSeedPhotos()) {
    await storage.delete(`${PHOTO_KEY_PREFIX}${file}`);
  }
}

// Create when missing, otherwise set the desired fields and save only when something changed.
async function loadTours(): Promise<void> {
  for (const [index, record] of seedTourRecords().entries()) {
    const desired = toTourDocument(record, index);
    const existing = await Tour.findById(desired._id);
    if (existing === null) {
      await Tour.create(desired);
      continue;
    }
    existing.set(withoutId(desired));
    if (existing.isModified()) await existing.save();
  }
}

// Pitfall 3: a save re-hashes the password and stamps passwordChangedAt, so the password is set only
// when the stored hash no longer matches the configured value. A re-run then changes nothing.
async function loadUsers(passwords: SeedPasswords): Promise<void> {
  for (const person of seedUserRecords()) {
    const password = person.role === 'admin' ? passwords.admin : passwords.user;
    const desired = {
      name: person.name,
      email: person.email,
      role: person.role,
      active: person.active,
    };
    const existing = await User.findById(person._id).select('+password +active');
    if (existing === null) {
      await User.create({ _id: new Types.ObjectId(person._id), ...desired, password });
      continue;
    }
    existing.set(desired);
    if (!(await bcrypt.compare(password, existing.password))) {
      existing.password = password;
    }
    if (existing.isModified()) await existing.save();
  }
}

// Reviews and bookings keep the createdAt in their seed files, so past records never move (Pattern 4).
async function loadReviews(): Promise<void> {
  for (const record of seedReviewRecords()) {
    const desired = {
      review: record.review,
      rating: record.rating,
      tour: new Types.ObjectId(record.tour),
      user: new Types.ObjectId(record.user),
      createdAt: new Date(record.createdAt),
    };
    const existing = await Review.findById(record._id);
    if (existing === null) {
      await Review.create({ _id: new Types.ObjectId(record._id), ...desired });
      continue;
    }
    existing.set(desired);
    if (existing.isModified()) await existing.save();
  }
}

async function loadBookings(): Promise<void> {
  for (const record of seedBookingRecords()) {
    const desired = {
      tour: new Types.ObjectId(record.tour),
      user: new Types.ObjectId(record.user),
      price: record.price,
      currency: record.currency,
      startDate: fromIstDay(record.startDate),
      status: record.status,
      createdAt: new Date(record.createdAt),
    };
    const existing = await Booking.findById(record._id);
    if (existing === null) {
      await Booking.create({ _id: new Types.ObjectId(record._id), ...desired });
      continue;
    }
    existing.set(desired);
    if (existing.isModified()) await existing.save();
  }
}

/**
 * Loads the seed into the database and the storage adapter. Idempotent: a second run changes nothing.
 * Refuses before connecting unless APP_ENV allows it (SEC-16). Returns the counts stored afterwards.
 */
export async function runSeed({
  reset,
  passwords,
}: {
  reset: boolean;
  passwords: SeedPasswords;
}): Promise<SeedCounts> {
  assertSeedAllowed({ appEnv: getConfig().APP_ENV, reset });
  await connectDb();
  // QA-18: the 2dsphere and unique indexes exist before the first query that needs them.
  await Promise.all([
    Tour.syncIndexes(),
    User.syncIndexes(),
    Review.syncIndexes(),
    Booking.syncIndexes(),
  ]);
  if (reset) await resetSeed();
  await uploadPhotos();
  await loadTours();
  await loadUsers(passwords);
  await loadReviews();
  await loadBookings();
  return {
    tours: await Tour.countDocuments(),
    users: await User.countDocuments(),
    reviews: await Review.countDocuments(),
    bookings: await Booking.countDocuments(),
    photos: listSeedPhotos().length,
  };
}
