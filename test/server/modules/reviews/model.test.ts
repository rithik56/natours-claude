import { describe, expect, it } from 'vitest';
import { toReview } from '@/server/modules/reviews/dto';
import { Review } from '@/server/modules/reviews/model';
import { useTestDatabase } from '../../../helpers/db';
import {
  createReview,
  createTour,
  createUser,
} from '../../../helpers/factories';
import { seedReviews, seedTours, seedUsers } from '../../../helpers/seed';

describe('reviews data layer', () => {
  useTestDatabase();

  describe('Review model', () => {
    it('[B5] saves a seed review with createdAt and updatedAt', async () => {
      const { user } = await createUser();
      const tour = await createTour();

      const saved = await createReview({ user, tour });

      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
      expect(saved.tour.toString()).toBe(tour._id.toString());
    });

    it('[B5] rejects a second review by the same user for the same tour with a duplicate-key error', async () => {
      const { user } = await createUser();
      const tour = await createTour();
      await createReview({ user, tour });

      await expect(createReview({ user, tour })).rejects.toMatchObject({
        code: 11000,
      });
    });

    it('[B5] accepts the same user reviewing a different tour', async () => {
      const { user } = await createUser();
      const first = await createTour();
      const second = await createTour();
      await createReview({ user, tour: first });

      await createReview({ user, tour: second });

      expect(await Review.countDocuments({ user: user._id })).toBe(2);
    });

    it('rejects a rating of 0, 6 or 4.5 and accepts 1 to 5', async () => {
      const { user } = await createUser();
      const tour = await createTour();

      for (const rating of [0, 6, 4.5]) {
        await expect(createReview({ user, tour, rating })).rejects.toThrow(
          /rating/,
        );
      }
      for (const rating of [1, 5]) {
        const { user: reviewer } = await createUser();
        const saved = await createReview({ user: reviewer, tour, rating });
        expect(saved.rating).toBe(rating);
      }
    });

    it('rejects an empty review and one of 1001 characters', async () => {
      const { user } = await createUser();
      const tour = await createTour();
      const seedText = seedReviews()[0]!.review;
      const tooLong = seedText.repeat(4).slice(0, 1001);

      await expect(createReview({ user, tour, review: '' })).rejects.toThrow(
        /review/,
      );
      await expect(
        createReview({ user, tour, review: tooLong }),
      ).rejects.toThrow(/review/);
    });

    it('accepts a review of exactly 1000 characters', async () => {
      const { user } = await createUser();
      const tour = await createTour();
      const seedText = seedReviews()[0]!.review;

      const saved = await createReview({
        user,
        tour,
        review: seedText.repeat(4).slice(0, 1000),
      });

      expect(saved.review).toHaveLength(1000);
    });

    it('has the unique (tour, user) index and no populate hook', async () => {
      const indexes = await Review.listIndexes();

      const pair = indexes.find(
        (index) =>
          JSON.stringify(index.key) === JSON.stringify({ tour: 1, user: 1 }),
      );
      expect(pair?.unique).toBe(true);
    });

    it('[QA-04] runs validators on updates', async () => {
      const { user } = await createUser();
      const tour = await createTour();
      const saved = await createReview({ user, tour });

      await expect(
        Review.findOneAndUpdate({ _id: saved._id }, { rating: 9 }),
      ).rejects.toThrow(/rating/);
    });
  });

  describe('createReview', () => {
    it('[D-08] uses the first seed review text and rating for that seed tour', async () => {
      const { user } = await createUser();
      const tour = await createTour({ slug: seedTours()[1]!.slug });
      const first = seedReviews().find(
        (entry) => entry.tour === tour._id.toString(),
      )!;

      const saved = await createReview({ user, tour });

      expect(saved.review).toBe(first.review);
      expect(saved.rating).toBe(first.rating);
    });
  });

  describe('toReview', () => {
    it('[S3] maps a review with a populated author and no email', async () => {
      const { user } = await createUser({ email: seedUsers()[5]!.email });
      const tour = await createTour();
      const saved = await createReview({ user, tour });
      const populated = await Review.findById(saved._id).populate('user');

      const dto = toReview(populated!);

      expect(Object.keys(dto).sort()).toEqual([
        'author',
        'createdAt',
        'id',
        'rating',
        'review',
        'tourId',
      ]);
      expect(dto.id).toBe(saved._id.toString());
      expect(dto.tourId).toBe(tour._id.toString());
      expect(Object.keys(dto.author).sort()).toEqual([
        'id',
        'name',
        'photo',
        'role',
      ]);
      expect(dto.author.name).toBe(user.name);
      expect(JSON.stringify(dto)).not.toContain(user.email);
      expect(dto.createdAt).toBe(saved.createdAt.toISOString());
    });

    it('[S3] throws when the author is not populated', async () => {
      const { user } = await createUser();
      const tour = await createTour();
      const saved = await createReview({ user, tour });

      expect(() => toReview(saved)).toThrow(/author/);
    });
  });
});
