import { describe, expect, it } from 'vitest';
import { fromIstDay } from '@/lib/ist';
import { toBooking } from '@/server/modules/bookings/dto';
import { Booking } from '@/server/modules/bookings/model';
import { useTestDatabase } from '../../../helpers/db';
import {
  createBooking,
  createTour,
  createUser,
} from '../../../helpers/factories';
import { seedBookings, seedTours } from '../../../helpers/seed';

describe('bookings data layer', () => {
  useTestDatabase();

  describe('Booking model', () => {
    it('[B20] accepts a price of 18999 and rejects 0, -1 and 18999.5', async () => {
      const { user } = await createUser();
      const tour = await createTour({ slug: seedTours()[0]!.slug });

      const saved = await createBooking({ user, tour, price: 18999 });
      expect(saved.price).toBe(18999);

      for (const price of [0, -1, 18999.5]) {
        await expect(createBooking({ user, tour, price })).rejects.toThrow(
          /price/,
        );
      }
    });

    it('defaults currency to inr and status to paid, and rejects other values', async () => {
      const { user } = await createUser();
      const tour = await createTour();
      const booking = await createBooking({ user, tour });

      expect(booking.currency).toBe('inr');
      expect(booking.status).toBe('paid');

      booking.currency = 'usd' as never;
      await expect(booking.validate()).rejects.toThrow(/currency/);
      booking.currency = 'inr';

      booking.status = 'pending' as never;
      await expect(booking.validate()).rejects.toThrow(/status/);
      booking.status = 'refunded';
      await expect(booking.validate()).resolves.toBeUndefined();
    });

    it('[B19] accepts a start date at 00:00 IST and rejects one at 00:00 UTC', async () => {
      const { user } = await createUser();
      const tour = await createTour();

      const saved = await createBooking({
        user,
        tour,
        startDate: fromIstDay('2026-08-01'),
      });
      expect(saved.startDate.toISOString()).toBe('2026-07-31T18:30:00.000Z');

      await expect(
        createBooking({
          user,
          tour,
          startDate: new Date('2026-08-01T00:00:00Z'),
        }),
      ).rejects.toThrow(/startDate/);
    });

    it('saves two bookings without a stripeSessionId', async () => {
      const { user } = await createUser();
      const tour = await createTour();

      await createBooking({ user, tour });
      await createBooking({ user, tour });

      expect(await Booking.countDocuments()).toBe(2);
    });

    it('[B5] rejects a duplicate stripeSessionId with a duplicate-key error', async () => {
      const { user } = await createUser();
      const tour = await createTour();
      await createBooking({ user, tour, stripeSessionId: 'cs_test_one' });

      await expect(
        createBooking({ user, tour, stripeSessionId: 'cs_test_one' }),
      ).rejects.toMatchObject({ code: 11000 });
    });

    it('has the user and tour indexes and a sparse unique stripeSessionId index', async () => {
      const indexes = await Booking.listIndexes();
      const find = (key: object) =>
        indexes.find(
          (index) => JSON.stringify(index.key) === JSON.stringify(key),
        );

      expect(find({ user: 1 })).toBeDefined();
      expect(find({ tour: 1 })).toBeDefined();
      expect(find({ stripeSessionId: 1 })).toMatchObject({
        unique: true,
        sparse: true,
      });
    });

    it('[QA-04] runs validators on updates', async () => {
      const { user } = await createUser();
      const tour = await createTour();
      const booking = await createBooking({ user, tour });

      await expect(
        Booking.findOneAndUpdate({ _id: booking._id }, { price: 0 }),
      ).rejects.toThrow(/price/);
    });

    it('adds createdAt and updatedAt', async () => {
      const { user } = await createUser();
      const tour = await createTour();

      const booking = await createBooking({ user, tour });

      expect(booking.createdAt).toBeInstanceOf(Date);
      expect(booking.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('createBooking', () => {
    it('defaults the start date to the first of the tour and the price to its price', async () => {
      const { user } = await createUser();
      const record = seedTours()[3]!;
      const tour = await createTour({ slug: record.slug });

      const booking = await createBooking({ user, tour });

      expect(booking.startDate.toISOString()).toBe(
        fromIstDay(record.startDates[0]!).toISOString(),
      );
      expect(booking.price).toBe(record.price);
    });

    it('[D-08] seed bookings keep the tour price, so the default matches the catalogue', () => {
      const tours = seedTours();
      for (const booking of seedBookings()) {
        const tour = tours.find((entry) => entry._id === booking.tour);
        expect(booking.price).toBe(tour?.price);
      }
    });
  });

  describe('toBooking', () => {
    it('[S3] returns exactly the documented keys, all JSON-safe', async () => {
      const { user } = await createUser();
      const tour = await createTour();
      const booking = await createBooking({
        user,
        tour,
        startDate: fromIstDay('2026-08-01'),
      });

      const dto = toBooking(booking);

      expect(Object.keys(dto).sort()).toEqual([
        'createdAt',
        'currency',
        'id',
        'price',
        'startDate',
        'status',
        'tourId',
      ]);
      expect(dto.id).toBe(booking._id.toString());
      expect(dto.tourId).toBe(tour._id.toString());
      expect(dto.startDate).toBe('2026-08-01');
      expect(dto.price).toBe(tour.price);
      expect(dto.currency).toBe('inr');
      expect(dto.status).toBe('paid');
      expect(dto.createdAt).toBe(booking.createdAt.toISOString());
      expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
    });

    it('[S3] maps a lean record the same way', async () => {
      const { user } = await createUser();
      const tour = await createTour();
      const booking = await createBooking({ user, tour });
      const lean = await Booking.findById(booking._id).lean();

      expect(toBooking(lean!)).toEqual(toBooking(booking));
    });
  });
});
