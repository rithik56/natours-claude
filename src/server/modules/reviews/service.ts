import 'server-only';
import type { Types } from 'mongoose';
import { connectDb, isDbUnavailableError } from '@/server/db';
import { getDeps } from '@/server/deps';
import { AppError } from '@/server/errors';
import { getLogger } from '@/server/logger';
import { toReview, type ReviewDto } from './dto';
import { Review, type ReviewFields } from './model';

/** Reviews per page on a tour (D-08). */
const REVIEWS_PER_PAGE = 5;

/** One page of a tour's reviews, newest first (D-08). */
export type ReviewPage = {
  items: ReviewDto[];
  /** Every review the tour has, before paging. */
  total: number;
  /** The page shown: the one asked for, clamped to the last page. */
  page: number;
  totalPages: number;
};

type ReviewRecord = Pick<ReviewFields, 'review' | 'rating' | 'createdAt'> & {
  _id: Types.ObjectId;
  tour: Types.ObjectId;
  user: Parameters<typeof toReview>[0]['user'] | null;
};

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/**
 * Reads every review of one tour, newest first, with each author populated to name, photo and
 * role only (T-04-21). A review whose author document is gone is skipped and logged, never thrown
 * (B12). A deactivated author's review stays, because the populate does not filter on `active`.
 *
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
async function loadReviews(tourId: string): Promise<ReviewDto[]> {
  await connectDb();
  let records: ReviewRecord[];
  try {
    records = await Review.find({ tour: tourId })
      .sort({ createdAt: -1, _id: -1 })
      .populate({ path: 'user', select: 'name photo role' })
      .lean<ReviewRecord[]>();
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }

  const reviews: ReviewDto[] = [];
  for (const record of records) {
    if (record.user === null) {
      getLogger().warn(
        { reviewId: String(record._id), tourId },
        'review skipped: its author no longer exists',
      );
      continue;
    }
    reviews.push(toReview({ ...record, user: record.user }));
  }
  return reviews;
}

/**
 * One tour's reviews, paged five at a time (D-08, B12). The whole list is cached once under
 * `['reviews', tourId]`, tagged `reviews:<tourId>`, and the page is only sliced in memory. So a
 * page number never creates a cache entry (T-04-22), and an out-of-range page is clamped to the
 * last page.
 *
 * @param tourId - The tour's id, from the tour's own page data and never from the URL alone.
 * @param page - The page asked for, at least 1. Anything past the end shows the last page.
 * @returns The page of reviews with the total, the page shown and the page count.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function listForTour(
  tourId: string,
  page: number,
): Promise<ReviewPage> {
  if (!OBJECT_ID.test(tourId)) {
    return { items: [], total: 0, page: 1, totalPages: 1 };
  }
  const all = await getDeps().cache.cached(
    loadReviews,
    ['reviews', tourId],
    [`reviews:${tourId}`],
  )(tourId);

  const totalPages = Math.max(1, Math.ceil(all.length / REVIEWS_PER_PAGE));
  const requested = Number.isFinite(page) ? Math.floor(page) : 1;
  const current = Math.min(Math.max(1, requested), totalPages);
  const start = (current - 1) * REVIEWS_PER_PAGE;
  return {
    items: all.slice(start, start + REVIEWS_PER_PAGE),
    total: all.length,
    page: current,
    totalPages,
  };
}
