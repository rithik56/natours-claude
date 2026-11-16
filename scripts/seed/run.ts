import { readFileSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { fromIstDay, type IstDay, toIstDay } from '@/lib/ist';
import { getConfig } from '@/server/config';
import { connectDb } from '@/server/db';
import { getDeps } from '@/server/deps';
import { Booking } from '@/server/modules/bookings/model';
import { Review } from '@/server/modules/reviews/model';
import { Tour } from '@/server/modules/tours/model';
import { User } from '@/server/modules/users/model';
import { rollStartDates } from './dates';
import { checkSeedRules, type SeedRuleInput } from './rules';
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
// Returns the keys it stored, so the rule check can prove every credited photo is among them.
async function uploadPhotos(): Promise<string[]> {
  const { storage } = getDeps();
  const keys: string[] = [];
  for (const file of listSeedPhotos()) {
    const bytes = readFileSync(path.join(SEED_DIRECTORY, 'img', 'tours', file));
    const key = `${PHOTO_KEY_PREFIX}${file}`;
    await storage.put(key, bytes, 'image/jpeg');
    keys.push(key);
  }
  return keys;
}

function seedObjectIds(records: ReadonlyArray<{ _id: string }>): Types.ObjectId[] {
  return records.map((record) => new Types.ObjectId(record._id));
}

// ADR 0030: the rules read back only the documents this seed loads, by their fixed _ids, so app data
// a developer adds to the same database never breaks the seed's own rules.
async function readStoredSeed(
  today: IstDay,
  storedKeys: string[],
): Promise<SeedRuleInput> {
  const [tours, users, reviews, bookings] = await Promise.all([
    Tour.find({ _id: { $in: seedObjectIds(seedTourRecords()) } }).lean(),
    User.find({ _id: { $in: seedObjectIds(seedUserRecords()) } }).lean(),
    Review.find({ _id: { $in: seedObjectIds(seedReviewRecords()) } }).lean(),
    Booking.find({ _id: { $in: seedObjectIds(seedBookingRecords()) } }).lean(),
  ]);
  return {
    tours: tours.map((tour) => ({
      _id: String(tour._id),
      slug: tour.slug,
      duration: tour.duration,
      startDates: tour.startDates.map((day) => toIstDay(day)),
      ratingsAverage: tour.ratingsAverage,
      ratingsQuantity: tour.ratingsQuantity,
      guides: tour.guides.map((guide) => String(guide)),
      photoCredits: tour.photoCredits.map((credit) => ({ file: credit.file })),
    })),
    users: users.map((person) => ({
      _id: String(person._id),
      name: person.name,
      role: person.role,
    })),
    reviews: reviews.map((review) => ({
      _id: String(review._id),
      review: review.review,
      rating: review.rating,
      tour: String(review.tour),
      user: String(review.user),
    })),
    bookings: bookings.map((booking) => ({
      _id: String(booking._id),
      tour: String(booking.tour),
      user: String(booking.user),
      status: booking.status,
      startDate: toIstDay(booking.startDate),
    })),
    storedKeys,
    today,
  };
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
// ADR 0023: only the start dates that have passed by `today` move, by whole years, and the Golden
// Triangle Friday rule applies after the roll. Bookings and reviews are never rolled.
async function loadTours(today: IstDay): Promise<void> {
  for (const [index, record] of seedTourRecords().entries()) {
    const rolled = {
      ...record,
      startDates: rollStartDates(record.startDates, today, record.slug),
    };
    const desired = toTourDocument(rolled, index);
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
  today,
}: {
  reset: boolean;
  passwords: SeedPasswords;
  today: IstDay;
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
  const storedKeys = await uploadPhotos();
  await loadTours(today);
  await loadUsers(passwords);
  await loadReviews();
  await loadBookings();
  // seed/README.md rules (ADR 0030): the first broken rule stops the run, and its name is in the message.
  const stored = await readStoredSeed(today, storedKeys);
  const [violation] = checkSeedRules(stored);
  if (violation) {
    throw new Error(`seed rule failed: ${violation.rule}: ${violation.detail}`);
  }
  return {
    tours: stored.tours.length,
    users: stored.users.length,
    reviews: stored.reviews.length,
    bookings: stored.bookings.length,
    photos: stored.storedKeys.length,
  };
}
