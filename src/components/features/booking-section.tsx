import { BookingPanel } from '@/components/ui/booking-panel';
import { toIstDay } from '@/lib/ist';
import { now } from '@/server/clock';
import { findUpcomingPaid } from '@/server/modules/bookings/service';
import type { TourDetail } from '@/server/modules/tours/dto';
import { getCurrentUser } from '@/server/session';
import { bookingPanelProps } from './booking-state';

type BookingSectionProps = {
  tour: Pick<TourDetail, 'id' | 'slug' | 'price' | 'startDates' | 'duration'>;
};

/**
 * The booking panel for the signed-in visitor (U11, R5). It depends on the user, so it is
 * never cached: it reads the session, then the traveller's own booking, on every request. The page
 * awaits it together with the guides and the reviews, with no Suspense boundary (ADR 0039).
 *
 * There is no try/catch here on purpose. A database outage in either read reaches the
 * Phase 3 error page, so a visitor is never shown a panel that guesses at their booking.
 */
export async function BookingSection({ tour }: BookingSectionProps) {
  const user = await getCurrentUser();
  const bookedDay = user
    ? await findUpcomingPaid(user.id, tour.id, tour.duration)
    : null;
  return (
    <BookingPanel
      {...bookingPanelProps({
        slug: tour.slug,
        price: tour.price,
        startDates: tour.startDates,
        signedIn: user !== null,
        bookedDay,
        today: toIstDay(now()),
      })}
    />
  );
}
