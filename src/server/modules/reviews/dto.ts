import 'server-only';
import { toPublicUser, type PublicUser } from '@/server/modules/users/dto';
import type { ReviewFields } from './model';

type AuthorSource = Parameters<typeof toPublicUser>[0];

type ReviewSource = Pick<ReviewFields, 'review' | 'rating' | 'createdAt'> & {
  _id: { toString(): string };
  tour: { toString(): string };
  user: AuthorSource | { toString(): string };
};

/** A review as the tour page and the reviews API show it (S3, R6). */
export type ReviewDto = {
  id: string;
  review: string;
  rating: number;
  tourId: string;
  author: PublicUser;
  /** An ISO timestamp. */
  createdAt: string;
};

function isAuthorRecord(
  user: AuthorSource | { toString(): string },
): user is AuthorSource {
  return typeof user === 'object' && 'name' in user && 'role' in user;
}

/**
 * Maps a review whose `user` is populated. The author goes through
 * `toPublicUser`, which leaves out private contact details. An id in place of the author
 * is a programming error, so it throws.
 */
export function toReview(review: ReviewSource): ReviewDto {
  if (!isAuthorRecord(review.user)) {
    throw new Error('toReview needs the review author to be populated');
  }
  return {
    id: review._id.toString(),
    review: review.review,
    rating: review.rating,
    tourId: review.tour.toString(),
    author: toPublicUser(review.user),
    createdAt: review.createdAt.toISOString(),
  };
}
