import 'server-only';
import { Types } from 'mongoose';
import { toIstDay, tripStatus, type IstDay } from '@/lib/ist';
import { now } from '@/server/clock';
import { connectDb, isDbUnavailableError } from '@/server/db';
import { AppError } from '@/server/errors';
import { Booking } from './model';

/**
 * The IST day of the traveller's earliest upcoming paid booking for one tour (U11, QA-06,
 * QA-07, SEC-07). A refunded booking never counts, and neither does a paid trip that has
 * already ended, so a past traveller may book the tour again.
 *
 * This read is deliberately not cached (R5): it depends on who is signed in, so it runs on
 * every request and never inside a cached function. ADR 0033 records why it returns the day
 * and not the boolean plan.md 4.4 names.
 *
 * @param userId - The signed-in user's id, from `getCurrentUser()` and nowhere else.
 * @param tourId - The tour's id.
 * @param durationDays - The tour's length in days, which decides when a trip has ended.
 * @returns The IST day the earliest upcoming paid booking starts; or null when there is none,
 * or when either id is malformed.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function findUpcomingPaid(
  userId: string,
  tourId: string,
  durationDays: number,
): Promise<IstDay | null> {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(tourId)) {
    return null;
  }
  await connectDb();
  try {
    const paid = await Booking.find({
      user: userId,
      tour: tourId,
      status: 'paid',
    })
      .select('startDate')
      .sort({ startDate: 1 })
      .lean<Array<{ startDate: Date }>>();
    const current = now();
    const upcoming = paid.find(
      (booking) =>
        tripStatus(booking.startDate, durationDays, current) === 'upcoming',
    );
    return upcoming ? toIstDay(upcoming.startDate) : null;
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}

/**
 * How many bookings a tour has, paid and refunded alike (F6). The tour delete asks this before it
 * removes anything, so a tour with any booking is refused and no booking can point at a deleted
 * tour through the API (T-04-34). Not cached: it is a count taken at the moment of a delete.
 *
 * @param tourId - The tour's id. A malformed id has no bookings.
 * @returns The number of bookings for the tour, zero when there are none.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function countForTour(tourId: string): Promise<number> {
  if (!Types.ObjectId.isValid(tourId)) return 0;
  await connectDb();
  try {
    return await Booking.countDocuments({ tour: tourId });
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}
