import { fromIstDay } from '@/lib/ist';
import { Review, type ReviewDoc } from '@/server/modules/reviews/model';
import { Tour, type TourDoc } from '@/server/modules/tours/model';
import { User, type UserDoc } from '@/server/modules/users/model';
import type { Role } from '@/server/roles';
import { seedReviews, seedTours, seedUsers, type SeedUser } from './seed';

/** A test-only password, used for every factory user. It is never shown to a person. */
export const TEST_PASSWORD = 'Test-only-passphrase-2026';

type CreateUserOptions = {
  role?: Role;
  active?: boolean;
  /** Selects that seed person. Must be one of the emails in seed/data/users.json. */
  email?: string;
  password?: string;
  /** Written through the raw collection, so tests can build stale-token cases (SEC-18). */
  passwordChangedAt?: Date;
};

async function pickSeedPerson(options: CreateUserOptions): Promise<SeedUser> {
  const people = seedUsers();
  if (options.email !== undefined) {
    const person = people.find((entry) => entry.email === options.email);
    if (!person) {
      throw new Error(
        `createUser: ${options.email} is not a person in seed/data/users.json`,
      );
    }
    return person;
  }
  const role = options.role ?? 'user';
  const candidates = people.filter((entry) => entry.role === role);
  const taken = await User.find({
    _id: { $in: candidates.map((entry) => entry._id) },
  })
    .select('_id')
    .lean();
  const takenIds = new Set(taken.map((entry) => String(entry._id)));
  const next = candidates.find((entry) => !takenIds.has(entry._id));
  if (!next) {
    throw new Error(
      `createUser: every seed person with role ${role} already exists in this database`,
    );
  }
  return next;
}

/**
 * Creates a user from a real person in seed/data/users.json (D-08, QA-17).
 * Without `email`, picks the next seed person of the requested role (default user)
 * who is not yet in this database.
 */
export async function createUser(
  options: CreateUserOptions = {},
): Promise<{ user: UserDoc; password: string }> {
  const person = await pickSeedPerson(options);
  const password = options.password ?? TEST_PASSWORD;
  const user = await User.create({
    _id: person._id,
    name: person.name,
    email: person.email,
    role: person.role,
    active: options.active ?? person.active,
    password,
  });
  if (options.passwordChangedAt !== undefined) {
    await User.collection.updateOne(
      { _id: user._id },
      { $set: { passwordChangedAt: options.passwordChangedAt } },
    );
  }
  return { user, password };
}

type SeedTourRecord = ReturnType<typeof seedTours>[number] & {
  startLocation: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
    description: string;
  };
  locations: Array<{
    type: 'Point';
    coordinates: [number, number];
    description: string;
    day: number;
  }>;
  photoCredits: Array<{
    file: string;
    title: string;
    author: string;
    license: string;
    licenseUrl: string;
    sourceUrl: string;
  }>;
};

type CreateTourOptions = {
  /** Selects that seed tour. Without it, the next seed tour not yet in this database. */
  slug?: string;
  /** Only numbers, dates and the enum may change. Text always comes from the seed. */
  overrides?: Partial<{
    price: number;
    duration: number;
    maxGroupSize: number;
    difficulty: 'easy' | 'medium' | 'difficult';
    startDates: Date[];
    ratingsAverage: number;
    ratingsQuantity: number;
  }>;
  /** Also creates the tour's seed guides, so populate('guides') finds them. */
  withGuides?: boolean;
};

function seedTourRecords(): SeedTourRecord[] {
  return seedTours() as SeedTourRecord[];
}

async function pickSeedTour(slug: string | undefined): Promise<SeedTourRecord> {
  const records = seedTourRecords();
  if (slug !== undefined) {
    const record = records.find((entry) => entry.slug === slug);
    if (!record) {
      throw new Error(
        `createTour: ${slug} is not a tour in seed/data/tours.json`,
      );
    }
    return record;
  }
  const taken = await Tour.find({ _id: { $in: records.map((r) => r._id) } })
    .select('_id')
    .lean();
  const takenIds = new Set(taken.map((entry) => String(entry._id)));
  const next = records.find((entry) => !takenIds.has(entry._id));
  if (!next) {
    throw new Error(
      'createTour: every seed tour already exists in this database',
    );
  }
  return next;
}

async function createSeedGuides(guideIds: string[]): Promise<void> {
  const people = seedUsers();
  for (const id of guideIds) {
    if (await User.exists({ _id: id })) continue;
    const person = people.find((entry) => entry._id === id);
    if (!person) {
      throw new Error(`createTour: guide ${id} is not in seed/data/users.json`);
    }
    await createUser({ email: person.email });
  }
}

/**
 * Creates a tour by copying a real record from seed/data/tours.json, with its
 * seed _id (D-08, QA-17). Seed start dates become 00:00 IST instants (B19).
 */
export async function createTour(
  options: CreateTourOptions = {},
): Promise<TourDoc> {
  const record = await pickSeedTour(options.slug);
  if (options.withGuides) await createSeedGuides(record.guides);
  const { startDates, ...rest } = record;
  return Tour.create({
    ...rest,
    startDates: startDates.map(fromIstDay),
    ...options.overrides,
  });
}

type CreateReviewOptions = {
  user: UserDoc;
  tour: TourDoc;
  rating?: number;
  review?: string;
};

/**
 * Creates a review for a seed tour. The text and rating default to the first
 * review in seed/data/reviews.json for that tour (D-08, QA-17).
 */
export async function createReview(
  options: CreateReviewOptions,
): Promise<ReviewDoc> {
  const tourId = String(options.tour._id);
  const record = seedReviews().find((entry) => entry.tour === tourId);
  if (!record) {
    throw new Error(
      `createReview: no review for tour ${tourId} in seed/data/reviews.json`,
    );
  }
  return Review.create({
    tour: options.tour._id,
    user: options.user._id,
    review: options.review ?? record.review,
    rating: options.rating ?? record.rating,
  });
}
