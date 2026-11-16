// U11, R5, T-04-20: the streamed booking panel reads the signed-in traveller's own state on every
// request. Two travellers on the same tour see their own state, and a failed read is not caught.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BookingSection } from '@/components/features/booking-section';
import { fromIstDay } from '@/lib/ist';
import { AppError } from '@/server/errors';
import { findUpcomingPaid } from '@/server/modules/bookings/service';
import { getBySlug } from '@/server/modules/tours/service';
import { useTestDatabase } from '../../helpers/db';
import { createBooking, createTour, createUser } from '../../helpers/factories';
import { mockSession } from '../../helpers/mock-session';

// The real read stays in place for every test except the one that makes it fail.
vi.mock('@/server/modules/bookings/service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/server/modules/bookings/service')>();
  return { ...actual, findUpcomingPaid: vi.fn(actual.findUpcomingPaid) };
});

const LADAKH = 'ladakh-high-passes';

async function renderPanel(): Promise<string> {
  const tour = await getBySlug(LADAKH);
  if (!tour) throw new Error('the Ladakh seed tour is missing');
  return renderToStaticMarkup(await BookingSection({ tour }));
}

describe('[U11] BookingSection', () => {
  useTestDatabase();

  it('[U11] two travellers on the same tour each see their own state, from the same server', async () => {
    const tour = await createTour({ slug: LADAKH });
    const { user: booked } = await createUser();
    const { user: free } = await createUser();
    await createBooking({
      user: booked,
      tour,
      startDate: fromIstDay('2027-06-12'),
    });

    await mockSession(booked);
    const bookedPanel = await renderPanel();
    await mockSession(free);
    const freePanel = await renderPanel();

    // The panel's aria-label is also "Book this tour", so the check looks for the button element.
    const bookButton = /<button[^>]*>Book this tour<\/button>/;
    expect(bookedPanel).toMatch(/You’re booked for 12 Jun 2027\./);
    expect(bookedPanel).not.toMatch(bookButton);
    expect(freePanel).not.toMatch(/You’re booked/);
    expect(freePanel).toMatch(bookButton);
    expect(freePanel).toContain('12 Jun 2027');
  });

  it('[U11] a visitor who is logged out sees the dates, the price and Log in to book', async () => {
    await createTour({ slug: LADAKH });
    await mockSession(null);

    const markup = await renderPanel();

    expect(markup).toContain('Log in to book');
    expect(markup).toContain('/login?next=%2Ftour%2Fladakh-high-passes');
    expect(markup).toContain('₹42,999 per person');
  });

  it('[U11] a traveller whose only paid trip is past is offered the bookable state again', async () => {
    const tour = await createTour({ slug: LADAKH });
    const { user } = await createUser();
    await createBooking({ user, tour, startDate: fromIstDay('2025-01-10') });
    await mockSession(user);

    const markup = await renderPanel();

    expect(markup).not.toMatch(/You’re booked/);
    expect(markup).toMatch(/<button[^>]*>Book this tour<\/button>/);
  });

  it('[T-04-20] a failed booking read makes the section reject, with no local catch', async () => {
    await createTour({ slug: LADAKH });
    const { user } = await createUser();
    await mockSession(user);
    vi.mocked(findUpcomingPaid).mockRejectedValueOnce(
      new AppError('SERVICE_UNAVAILABLE'),
    );

    const tour = await getBySlug(LADAKH);
    if (!tour) throw new Error('the Ladakh seed tour is missing');

    await expect(BookingSection({ tour })).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
  });
});
