// B12, U11, D-08, T-04-21, T-04-22: a tour's reviews are read once under ['reviews', tourId], newest
// first, and paged five at a time in memory. A page number never creates a cache entry.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDeps } from '@/server/deps';
import { getLogger } from '@/server/logger';
import { Review } from '@/server/modules/reviews/model';
import { listForTour } from '@/server/modules/reviews/service';
import type { TourDoc } from '@/server/modules/tours/model';
import { User } from '@/server/modules/users/model';
import { useTestDatabase } from '../../../helpers/db';
import {
  createReview,
  createTour,
  createUser,
} from '../../../helpers/factories';

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.parse('2026-01-01T00:00:00Z');

/** Adds reviews by new travellers, one day apart, so the newest is the last one added. */
async function addReviews(tour: TourDoc, count: number, startDay = 0) {
  const added = [];
  for (let index = 0; index < count; index += 1) {
    const { user } = await createUser();
    added.push(
      await createReview({
        user,
        tour,
        createdAt: new Date(BASE + (startDay + index) * DAY),
      }),
    );
  }
  return added;
}

describe('reviews service: listForTour', () => {
  useTestDatabase();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('[B12] lists the four reviews of a seed tour newest first, with one page and only public author fields', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    await addReviews(tour, 4);

    const result = await listForTour(String(tour._id), 1);

    expect(result.total).toBe(4);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
    expect(result.items.map((item) => item.createdAt)).toEqual(
      [3, 2, 1, 0].map((day) => new Date(BASE + day * DAY).toISOString()),
    );
    for (const item of result.items) {
      expect(Object.keys(item.author).sort()).toEqual([
        'id',
        'name',
        'photo',
        'role',
      ]);
      expect(item.author).not.toHaveProperty('email');
    }
  });

  it('[D-08] with six reviews, page 1 holds the five newest and page 2 holds the oldest', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    await addReviews(tour, 4);
    const [newOne, newTwo] = await addReviews(tour, 2, 4);

    const first = await listForTour(String(tour._id), 1);
    const second = await listForTour(String(tour._id), 2);

    expect(first.items).toHaveLength(5);
    expect(first.items.slice(0, 2).map((item) => item.id)).toEqual([
      String(newTwo?._id),
      String(newOne?._id),
    ]);
    expect(first.total).toBe(6);
    expect(first.totalPages).toBe(2);
    expect(second.items).toHaveLength(1);
    expect(second.page).toBe(2);
  });

  it('[D-08] a page past the end is clamped to the last page, so ?reviewPage=999999 shows page 2', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    await addReviews(tour, 6);

    const result = await listForTour(String(tour._id), 999999);

    expect(result.page).toBe(2);
    expect(result.items).toHaveLength(1);
  });

  it('[T-04-22] only the full list is cached under ["reviews", tourId], so a page number creates no cache entry', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    await addReviews(tour, 6);
    const cached = vi.spyOn(getDeps().cache, 'cached');
    const tourId = String(tour._id);

    await listForTour(tourId, 1);
    await listForTour(tourId, 999999);

    expect(cached).toHaveBeenCalled();
    for (const call of cached.mock.calls) {
      expect(call[1]).toEqual(['reviews', tourId]);
      expect(call[2]).toEqual([`reviews:${tourId}`]);
    }
  });

  it('[B12] a review whose author was deleted is skipped and a warning is logged; the call does not throw', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    const [kept, gone] = await addReviews(tour, 2);
    await User.deleteOne({ _id: gone?.user });
    const warn = vi.spyOn(getLogger(), 'warn');

    const result = await listForTour(String(tour._id), 1);

    expect(result.items.map((item) => item.id)).toEqual([String(kept?._id)]);
    expect(result.total).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('[B12] a deactivated author’s review stays visible (RESEARCH A9)', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    const { user } = await createUser({ active: false });
    await createReview({ user, tour });

    const result = await listForTour(String(tour._id), 1);

    expect(result.total).toBe(1);
    expect(result.items[0]?.author.id).toBe(String(user._id));
  });

  it('[U11] a tour with no reviews lists nothing, with one page and a total of 0', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });

    const result = await listForTour(String(tour._id), 1);

    expect(result).toEqual({ items: [], total: 0, page: 1, totalPages: 1 });
  });

  it('[B10] a read that fails with a network error is refused as SERVICE_UNAVAILABLE, with the driver error as the cause', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    const driverError = Object.assign(new Error('connection reset'), {
      name: 'MongoNetworkError',
    });
    vi.spyOn(Review, 'find').mockImplementation(() => {
      throw driverError;
    });

    const error = await listForTour(String(tour._id), 1).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    expect((error as Error).cause).toBe(driverError);
  });
});
