import type { IstDay } from '@/lib/ist';

// Scaffold for the seed/README.md rule checks (ADR 0030). The rules arrive with the GREEN step.

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

/** Returns every broken rule, in the order of seed/README.md. An empty array means the data is consistent. */
export function checkSeedRules(input: SeedRuleInput): SeedRuleViolation[] {
  void input;
  return [];
}
