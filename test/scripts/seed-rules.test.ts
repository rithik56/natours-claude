import { describe, expect, it, vi } from 'vitest';
import {
  PHOTO_KEY_PREFIX,
  listSeedPhotos,
  seedBookingRecords,
  seedReviewRecords,
  seedTourRecords,
  seedUserRecords,
} from '../../scripts/seed/load.ts';
import { checkSeedRules, type SeedRuleInput } from '../../scripts/seed/rules.ts';
import { runSeed } from '../../scripts/seed/run.ts';
import { useTestDatabase } from '../helpers/db';

// Forces one violation through runSeed, so the test can prove runSeed stops on a broken rule.
// Every other call goes to the real checkSeedRules.
const forced = vi.hoisted(() => ({
  violation: undefined as undefined | { rule: string; detail: string },
}));

vi.mock('../../scripts/seed/rules.ts', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../scripts/seed/rules.ts')>();
  return {
    ...actual,
    checkSeedRules: (input: SeedRuleInput) =>
      forced.violation ? [forced.violation] : actual.checkSeedRules(input),
  };
});

// Test-only passwords. They are never shown to a person and never committed as configuration.
const PASSWORDS = {
  user: 'seed-test-traveller-pass',
  admin: 'seed-test-admin-passphrase-2026',
};

const TODAY = '2026-11-08';

/** The unmodified seed as checkSeedRules sees it after a load, built from the real seed files only. */
function seedInput(): SeedRuleInput {
  return {
    tours: seedTourRecords().map((record) => ({
      _id: record._id,
      slug: record.slug,
      duration: record.duration,
      startDates: record.startDates,
      ratingsAverage: record.ratingsAverage,
      ratingsQuantity: record.ratingsQuantity,
      guides: record.guides,
      photoCredits: record.photoCredits.map((credit) => ({
        file: `${PHOTO_KEY_PREFIX}${credit.file}`,
      })),
    })),
    users: seedUserRecords().map(({ _id, name, role }) => ({ _id, name, role })),
    reviews: seedReviewRecords().map(({ _id, review, rating, tour, user }) => ({
      _id,
      review,
      rating,
      tour,
      user,
    })),
    bookings: seedBookingRecords().map(
      ({ _id, tour, user, status, startDate }) => ({
        _id,
        tour,
        user,
        status,
        startDate,
      }),
    ),
    storedKeys: listSeedPhotos().map((file) => `${PHOTO_KEY_PREFIX}${file}`),
    today: TODAY,
  };
}

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`the seed has no ${what}`);
  return value;
}

function rulesBroken(input: SeedRuleInput): string[] {
  return checkSeedRules(input).map((violation) => violation.rule);
}

describe('checkSeedRules', () => {
  it('[D10] the unmodified seed passes every seed/README.md rule on 2026-11-08', () => {
    expect(checkSeedRules(seedInput())).toEqual([]);
  });

  it('[D10] upcoming-departure: a tour with no start date after today is reported', () => {
    const input = seedInput();
    const tour = must(
      input.tours.find((entry) => entry.slug === 'meghalaya-living-root-bridges'),
      'Meghalaya tour',
    );
    tour.startDates = ['2026-11-01', '2026-11-08'];
    expect(rulesBroken(input)).toContain('upcoming-departure');
  });

  it('[D10] review-needs-past-booking: a review whose author has no paid past booking for that tour is reported', () => {
    const input = seedInput();
    const review = must(input.reviews[0], 'review');
    input.bookings = input.bookings.filter(
      (booking) => !(booking.tour === review.tour && booking.user === review.user),
    );
    expect(rulesBroken(input)).toContain('review-needs-past-booking');
  });

  it('[D10] one-review-per-tour: a second review by the same traveller of the same tour is reported', () => {
    const input = seedInput();
    const review = must(input.reviews[0], 'review');
    input.reviews.push({ ...review, _id: '0'.repeat(24) });
    expect(rulesBroken(input)).toContain('one-review-per-tour');
  });

  it('[D10] golden-triangle-friday: a Golden Triangle departure whose day 4 is a Friday is reported', () => {
    const input = seedInput();
    const tour = must(
      input.tours.find((entry) => entry.slug === 'golden-triangle-heritage'),
      'Golden Triangle tour',
    );
    // 1 Dec 2026 is a Tuesday, so day 4 (4 Dec 2026) is a Friday.
    tour.startDates = ['2026-12-01', '2027-01-30', '2027-03-06'];
    expect(rulesBroken(input)).toContain('golden-triangle-friday');
  });

  it('[D10] upcoming-booking-date: an upcoming booking whose date is not a start date of its tour is reported', () => {
    const input = seedInput();
    const booking = must(
      input.bookings.find((entry) => entry.startDate > TODAY),
      'upcoming booking',
    );
    booking.startDate = '2030-01-01';
    expect(rulesBroken(input)).toContain('upcoming-booking-date');
  });

  it('[D10] ratings-match: a stored ratingsAverage that differs from the reviews is reported', () => {
    const input = seedInput();
    const tour = must(input.tours[0], 'tour');
    tour.ratingsAverage = 3.9;
    expect(rulesBroken(input)).toContain('ratings-match');
  });

  it('[D10] counts: a missing user is reported against the expected 35', () => {
    const input = seedInput();
    input.users = input.users.slice(1);
    expect(rulesBroken(input)).toContain('counts');
  });

  it('[D10] credits-stored: a credited photo the run did not store is reported', () => {
    const input = seedInput();
    input.storedKeys = input.storedKeys.slice(1);
    expect(rulesBroken(input)).toContain('credits-stored');
  });

  it('[D10] guide-named-in-review: a review that names a guide not assigned to its tour is reported', () => {
    const input = seedInput();
    const review = must(input.reviews[0], 'review');
    const tour = must(
      input.tours.find((entry) => entry._id === review.tour),
      'tour of the review',
    );
    const outsider = must(
      input.users.find(
        (person) =>
          (person.role === 'guide' || person.role === 'lead-guide') &&
          !tour.guides.includes(person._id),
      ),
      'guide not assigned to the tour',
    );
    const firstName = must(outsider.name.split(' ')[0], 'guide first name');
    review.review = `${review.review} ${firstName} was there too.`;
    expect(rulesBroken(input)).toContain('guide-named-in-review');
  });

  it('[D10] the guide-name heuristic reads only the seed files and finds every named guide assigned to the tour', () => {
    const guides = new Map(
      seedUserRecords()
        .filter((person) => person.role === 'guide' || person.role === 'lead-guide')
        .map((person) => [person._id, person.name.split(' ')[0] ?? ''] as const),
    );
    const assignments = new Map(
      seedTourRecords().map((tour) => [tour._id, tour.guides] as const),
    );
    const unassigned: string[] = [];
    for (const review of seedReviewRecords()) {
      const words = new Set(review.review.split(/[^A-Za-z]+/));
      for (const [guideId, firstName] of guides) {
        if (words.has(firstName) && !assignments.get(review.tour)?.includes(guideId)) {
          unassigned.push(review._id);
        }
      }
    }
    expect(unassigned).toEqual([]);
  });
});

describe('runSeed with a broken rule', () => {
  useTestDatabase();

  it('[D10] runSeed throws "seed rule failed: <rule>: <detail>" when a rule is broken', async () => {
    forced.violation = { rule: 'counts', detail: 'tours: 12 stored, 13 expected' };
    try {
      await expect(
        runSeed({ reset: false, passwords: PASSWORDS, today: TODAY }),
      ).rejects.toThrow('seed rule failed: counts: tours: 12 stored, 13 expected');
    } finally {
      forced.violation = undefined;
    }
  });
});
