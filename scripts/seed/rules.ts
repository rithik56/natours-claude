import { addIstDays, fromIstDay, type IstDay, tripStatus } from '@/lib/ist';
import { GOLDEN_TRIANGLE_SLUG, weekdayOf } from './dates';

// ADR 0030: after every load the seed checks the "Rules the data already follows" section of
// seed/README.md, and stops on the first broken rule. Every check reads plain records with IST day
// strings, so the rules run the same way on the seed files and on the stored documents.

export type RuleTour = {
  _id: string;
  slug: string;
  duration: number;
  startDates: IstDay[];
  ratingsAverage: number;
  ratingsQuantity: number;
  guides: string[];
  photoCredits: Array<{ file: string }>;
};

export type RuleUser = { _id: string; name: string; role: string };

export type RuleReview = {
  _id: string;
  review: string;
  rating: number;
  tour: string;
  user: string;
};

export type RuleBooking = {
  _id: string;
  tour: string;
  user: string;
  status: string;
  startDate: IstDay;
};

export type SeedRuleInput = {
  tours: RuleTour[];
  users: RuleUser[];
  reviews: RuleReview[];
  bookings: RuleBooking[];
  storedKeys: readonly string[];
  today: IstDay;
};

export type SeedRuleViolation = { rule: string; detail: string };

/** The counts the seed must store (seed/README.md, ADR 0030): 13 tours, 35 users, 52 reviews, 58 bookings, 52 credits. */
export const EXPECTED_COUNTS = {
  tours: 13,
  users: 35,
  reviews: 52,
  bookings: 58,
  photoCredits: 52,
} as const;

const GUIDE_ROLES: readonly string[] = ['guide', 'lead-guide'];
const FRIDAY = 5;
const RATING_TOLERANCE = 1e-9;

/** A trip is past once its last IST day has gone, the same test the app uses for "My tours" (D-04). */
function isPast(startDate: IstDay, duration: number, today: IstDay): boolean {
  return (
    tripStatus(fromIstDay(startDate), duration, fromIstDay(today)) === 'past'
  );
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

function upcomingDepartureRule(input: SeedRuleInput): SeedRuleViolation[] {
  return input.tours
    .filter((tour) => !tour.startDates.some((day) => day > input.today))
    .map((tour) => ({
      rule: 'upcoming-departure',
      detail: `${tour.slug} has no start date after ${input.today}`,
    }));
}

function reviewNeedsPastBookingRule(input: SeedRuleInput): SeedRuleViolation[] {
  const toursById = new Map(input.tours.map((tour) => [tour._id, tour]));
  const violations: SeedRuleViolation[] = [];
  for (const review of input.reviews) {
    const tour = toursById.get(review.tour);
    const proven =
      tour !== undefined &&
      input.bookings.some(
        (booking) =>
          booking.tour === review.tour &&
          booking.user === review.user &&
          booking.status === 'paid' &&
          isPast(booking.startDate, tour.duration, input.today),
      );
    if (!proven) {
      violations.push({
        rule: 'review-needs-past-booking',
        detail: `review ${review._id} has no paid booking of ${tour?.slug ?? review.tour} on a past departure`,
      });
    }
  }
  return violations;
}

function onePerTravellerRule(input: SeedRuleInput): SeedRuleViolation[] {
  const seen = new Set<string>();
  const violations: SeedRuleViolation[] = [];
  for (const review of input.reviews) {
    const key = `${review.tour}:${review.user}`;
    if (seen.has(key)) {
      violations.push({
        rule: 'one-review-per-tour',
        detail: `review ${review._id} is a second review of the same tour by the same traveller`,
      });
    }
    seen.add(key);
  }
  return violations;
}

function goldenTriangleFridayRule(input: SeedRuleInput): SeedRuleViolation[] {
  const violations: SeedRuleViolation[] = [];
  for (const tour of input.tours) {
    if (tour.slug !== GOLDEN_TRIANGLE_SLUG) continue;
    for (const day of tour.startDates) {
      if (weekdayOf(addIstDays(day, 3)) === FRIDAY) {
        violations.push({
          rule: 'golden-triangle-friday',
          detail: `the ${day} departure of ${tour.slug} has day 4 on a Friday`,
        });
      }
    }
  }
  return violations;
}

/**
 * An upcoming booking is a paid booking whose departure day is still after today, the same test the
 * roll uses for "passed" (ADR 0023). A departure that starts today has passed and keeps its seed date.
 */
function upcomingBookingDateRule(input: SeedRuleInput): SeedRuleViolation[] {
  const toursById = new Map(input.tours.map((tour) => [tour._id, tour]));
  const violations: SeedRuleViolation[] = [];
  for (const booking of input.bookings) {
    if (booking.status !== 'paid' || booking.startDate <= input.today) continue;
    const tour = toursById.get(booking.tour);
    if (tour === undefined || !tour.startDates.includes(booking.startDate)) {
      violations.push({
        rule: 'upcoming-booking-date',
        detail: `upcoming booking ${booking._id} starts ${booking.startDate}, which is not a start date of ${tour?.slug ?? booking.tour}`,
      });
    }
  }
  return violations;
}

function ratingsMatchRule(input: SeedRuleInput): SeedRuleViolation[] {
  const violations: SeedRuleViolation[] = [];
  for (const tour of input.tours) {
    const ratings = input.reviews
      .filter((review) => review.tour === tour._id)
      .map((review) => review.rating);
    const quantity = ratings.length;
    const sum = ratings.reduce((total, rating) => total + rating, 0);
    const average = quantity === 0 ? 0 : roundToOneDecimal(sum / quantity);
    if (
      tour.ratingsQuantity !== quantity ||
      Math.abs(tour.ratingsAverage - average) > RATING_TOLERANCE
    ) {
      violations.push({
        rule: 'ratings-match',
        detail: `${tour.slug} stores ${tour.ratingsAverage} from ${tour.ratingsQuantity} ratings; the reviews give ${average} from ${quantity}`,
      });
    }
  }
  return violations;
}

function countsRule(input: SeedRuleInput): SeedRuleViolation[] {
  const actual = {
    tours: input.tours.length,
    users: input.users.length,
    reviews: input.reviews.length,
    bookings: input.bookings.length,
    photoCredits: input.tours.reduce(
      (total, tour) => total + tour.photoCredits.length,
      0,
    ),
  };
  const violations: SeedRuleViolation[] = [];
  for (const key of Object.keys(EXPECTED_COUNTS) as Array<
    keyof typeof EXPECTED_COUNTS
  >) {
    if (actual[key] !== EXPECTED_COUNTS[key]) {
      violations.push({
        rule: 'counts',
        detail: `${key}: ${actual[key]} stored, ${EXPECTED_COUNTS[key]} expected`,
      });
    }
  }
  return violations;
}

function creditsStoredRule(input: SeedRuleInput): SeedRuleViolation[] {
  const stored = new Set(input.storedKeys);
  const violations: SeedRuleViolation[] = [];
  for (const tour of input.tours) {
    for (const credit of tour.photoCredits) {
      if (!stored.has(credit.file)) {
        violations.push({
          rule: 'credits-stored',
          detail: `${credit.file} is credited to ${tour.slug} but was not stored`,
        });
      }
    }
  }
  return violations;
}

/**
 * A review may name only the guides assigned to its tour. The check looks for guide first names as
 * whole words, so "Gaurav's" counts and "Gauravi" does not.
 */
function guideNamedInReviewRule(input: SeedRuleInput): SeedRuleViolation[] {
  const toursById = new Map(input.tours.map((tour) => [tour._id, tour]));
  const guides = input.users.filter((person) =>
    GUIDE_ROLES.includes(person.role),
  );
  const violations: SeedRuleViolation[] = [];
  for (const review of input.reviews) {
    const tour = toursById.get(review.tour);
    if (tour === undefined) continue;
    const words = new Set(review.review.split(/[^A-Za-z]+/));
    for (const guide of guides) {
      const name = firstName(guide.name);
      if (words.has(name) && !tour.guides.includes(guide._id)) {
        violations.push({
          rule: 'guide-named-in-review',
          detail: `review ${review._id} names ${name}, who is not a guide of ${tour.slug}`,
        });
      }
    }
  }
  return violations;
}

/** Returns every broken rule, in the order of seed/README.md. An empty array means the data is consistent. */
export function checkSeedRules(input: SeedRuleInput): SeedRuleViolation[] {
  return [
    ...upcomingDepartureRule(input),
    ...reviewNeedsPastBookingRule(input),
    ...onePerTravellerRule(input),
    ...goldenTriangleFridayRule(input),
    ...upcomingBookingDateRule(input),
    ...ratingsMatchRule(input),
    ...countsRule(input),
    ...creditsStoredRule(input),
    ...guideNamedInReviewRule(input),
  ];
}
