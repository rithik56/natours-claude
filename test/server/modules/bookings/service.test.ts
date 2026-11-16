// U11, QA-06, QA-07, SEC-07: the booking panel's "booked" state is an upcoming paid booking of
// the signed-in traveller, read on every request and never cached (R5).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromIstDay } from '@/lib/ist';
import { Booking } from '@/server/modules/bookings/model';
import {
  countForTour,
  findUpcomingPaid,
} from '@/server/modules/bookings/service';
import { useTestDatabase } from '../../../helpers/db';
import {
  createBooking,
  createTour,
  createUser,
} from '../../../helpers/factories';

// Ladakh High Passes runs eight days, and its seed departures are in 2027, so these dates sit
// well clear of today's IST day (2026-11-16) and of any boundary in the test run.
const UPCOMING = '2027-06-12';
const LATER_UPCOMING = '2027-09-04';
const PAST = '2025-01-10';

describe('bookings service: findUpcomingPaid', () => {
  useTestDatabase();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('[U11] an upcoming paid booking returns the IST day it starts', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    const { user } = await createUser();
    await createBooking({
      user,
      tour,
      startDate: fromIstDay(UPCOMING),
    });

    const day = await findUpcomingPaid(
      String(user._id),
      String(tour._id),
      tour.duration,
    );

    expect(day).toBe(UPCOMING);
  });

  it('[QA-06] a refunded booking never counts, however far ahead its trip is', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    const { user } = await createUser();
    await createBooking({
      user,
      tour,
      startDate: fromIstDay(UPCOMING),
      status: 'refunded',
    });

    const day = await findUpcomingPaid(
      String(user._id),
      String(tour._id),
      tour.duration,
    );

    expect(day).toBeNull();
  });

  it('[QA-07] a paid trip that has already ended does not count, so the traveller may book again', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    const { user } = await createUser();
    await createBooking({ user, tour, startDate: fromIstDay(PAST) });

    const day = await findUpcomingPaid(
      String(user._id),
      String(tour._id),
      tour.duration,
    );

    expect(day).toBeNull();
  });

  it('[U11] with two upcoming paid bookings, the earlier start day is returned', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    const { user } = await createUser();
    await createBooking({ user, tour, startDate: fromIstDay(LATER_UPCOMING) });
    await createBooking({ user, tour, startDate: fromIstDay(UPCOMING) });

    const day = await findUpcomingPaid(
      String(user._id),
      String(tour._id),
      tour.duration,
    );

    expect(day).toBe(UPCOMING);
  });

  it('[SEC-07] another traveller’s booking on the same tour is not this traveller’s booking', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    const { user: booker } = await createUser();
    const { user: other } = await createUser();
    await createBooking({
      user: booker,
      tour,
      startDate: fromIstDay(UPCOMING),
    });

    const day = await findUpcomingPaid(
      String(other._id),
      String(tour._id),
      tour.duration,
    );

    expect(day).toBeNull();
  });

  it('[U11] a malformed user or tour id gives null, without a database read', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    const spy = vi.spyOn(Booking, 'find');

    expect(
      await findUpcomingPaid('not-an-id', String(tour._id), tour.duration),
    ).toBeNull();
    expect(
      await findUpcomingPaid(String(tour._id), 'nope', tour.duration),
    ).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('[B10] a read that fails with a network error is refused as SERVICE_UNAVAILABLE, with the driver error as the cause', async () => {
    const tour = await createTour({ slug: 'ladakh-high-passes' });
    const { user } = await createUser();
    const driverError = Object.assign(new Error('connection reset'), {
      name: 'MongoNetworkError',
    });
    vi.spyOn(Booking, 'find').mockImplementation(() => {
      throw driverError;
    });

    const error = await findUpcomingPaid(
      String(user._id),
      String(tour._id),
      tour.duration,
    ).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    expect((error as Error).cause).toBe(driverError);
  });

  describe('countForTour (F6)', () => {
    it('[F6] counts every booking of the tour, paid or refunded, and none of another tour', async () => {
      const tour = await createTour({ slug: 'valley-of-flowers-trek' });
      const other = await createTour({ slug: 'kedarkantha-winter-trek' });
      const { user: first } = await createUser();
      const { user: second } = await createUser();
      await createBooking({ user: first, tour, status: 'paid' });
      await createBooking({ user: second, tour, status: 'refunded' });
      await createBooking({ user: first, tour: other });

      expect(await countForTour(String(tour._id))).toBe(2);
    });

    it('[F6] a tour with no booking counts zero, and a malformed id counts zero', async () => {
      const tour = await createTour({ slug: 'valley-of-flowers-trek' });

      expect(await countForTour(String(tour._id))).toBe(0);
      expect(await countForTour('not-an-id')).toBe(0);
    });
  });
});
