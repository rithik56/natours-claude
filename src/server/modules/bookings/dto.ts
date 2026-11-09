import 'server-only';
import { toIstDay, type IstDay } from '@/lib/ist';
import type { BookingFields } from './model';

type BookingSource = Pick<
  BookingFields,
  'price' | 'currency' | 'startDate' | 'status' | 'createdAt'
> & {
  _id: { toString(): string };
  tour: { toString(): string };
};

/** A booking as the account pages and the API show it (S3, R6). */
export type BookingDto = {
  id: string;
  tourId: string;
  startDate: IstDay;
  /** Whole rupees. */
  price: number;
  currency: BookingFields['currency'];
  status: BookingFields['status'];
  /** An ISO timestamp. */
  createdAt: string;
};

/** Maps a booking. Phase 6 extends it with the tour summary for My tours. */
export function toBooking(booking: BookingSource): BookingDto {
  return {
    id: booking._id.toString(),
    tourId: booking.tour.toString(),
    startDate: toIstDay(booking.startDate),
    price: booking.price,
    currency: booking.currency,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
  };
}
