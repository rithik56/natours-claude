import type { BookingPanelProps } from '@/components/ui/booking-panel';
import type { IstDay } from '@/lib/ist';

/** What the panel knows about the visitor and the tour, all of it read by the caller. */
export type BookingPanelInput = {
  slug: string;
  /** Whole rupees, one price per tour (ADR 0014). */
  price: number;
  /** The tour's start dates as IST days, in any order. */
  startDates: IstDay[];
  signedIn: boolean;
  /** The IST day of the signed-in traveller's upcoming paid booking, or null (U11). */
  bookedDay: IstDay | null;
  /** Today's IST day. A start date on this day is not bookable (D-03). */
  today: IstDay;
};

/**
 * Chooses the booking panel's state from the data alone (U11, DES-17). The order is the
 * precedence the design contract names: no bookable date first, then a booking the traveller
 * already holds, then the signed-out visitor, and otherwise bookable.
 *
 * A start date is bookable only when its IST day is after today's, and the dates list is
 * ascending. ISO day strings sort in calendar order, so a plain string compare is exact.
 *
 * @returns The props for `BookingPanel`. Pure: nothing is read or written here.
 */
export function bookingPanelProps(input: BookingPanelInput): BookingPanelProps {
  const dates = input.startDates
    .filter((day) => day > input.today)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  if (dates.length === 0) return { status: 'no-dates' };
  if (input.bookedDay !== null) {
    return { status: 'booked', bookedDate: input.bookedDay };
  }
  if (!input.signedIn) {
    return {
      status: 'logged-out',
      dates,
      priceRupees: input.price,
      tourHref: `/tour/${input.slug}`,
    };
  }
  return { status: 'bookable', dates, priceRupees: input.price };
}
