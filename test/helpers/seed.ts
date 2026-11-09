import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Role } from '@/server/roles';

const seedDirectory = path.resolve(import.meta.dirname, '../../seed/data');

function readSeed<T>(fileName: string): T[] {
  return JSON.parse(
    readFileSync(path.join(seedDirectory, fileName), 'utf8'),
  ) as T[];
}

export type SeedUser = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

type SeedTour = {
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
};

type SeedReview = {
  _id: string;
  review: string;
  rating: number;
  tour: string;
  user: string;
  createdAt: string;
};

type SeedBooking = {
  _id: string;
  tour: string;
  user: string;
  price: number;
  currency: 'inr';
  startDate: string;
  status: string;
  createdAt: string;
};

/** The 35 people in seed/data/users.json. */
export function seedUsers(): SeedUser[] {
  return readSeed<SeedUser>('users.json');
}

/** The 13 tours in seed/data/tours.json. */
export function seedTours(): SeedTour[] {
  return readSeed<SeedTour>('tours.json');
}

/** The 52 reviews in seed/data/reviews.json. */
export function seedReviews(): SeedReview[] {
  return readSeed<SeedReview>('reviews.json');
}

/** The 58 bookings in seed/data/bookings.json. */
export function seedBookings(): SeedBooking[] {
  return readSeed<SeedBooking>('bookings.json');
}
