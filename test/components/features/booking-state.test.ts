// U11: the booking panel's state is chosen from the data alone, in the order the design contract names.
import { describe, expect, it } from 'vitest';
import {
  bookingPanelProps,
  type BookingPanelInput,
} from '@/components/features/booking-state';

const TODAY = '2026-11-16';

const base: BookingPanelInput = {
  slug: 'ladakh-high-passes',
  price: 42999,
  startDates: ['2027-06-12', '2027-07-17', '2027-09-04'],
  signedIn: true,
  bookedDay: null,
  today: TODAY,
};

describe('[U11] bookingPanelProps', () => {
  it('[U11] a signed-in traveller with no booking gets the bookable state with the dates and price', () => {
    expect(bookingPanelProps(base)).toEqual({
      status: 'bookable',
      dates: ['2027-06-12', '2027-07-17', '2027-09-04'],
      priceRupees: 42999,
    });
  });

  it('[U11] a visitor who is not signed in gets logged-out, with the dates, the price and the tour path', () => {
    expect(bookingPanelProps({ ...base, signedIn: false })).toEqual({
      status: 'logged-out',
      dates: ['2027-06-12', '2027-07-17', '2027-09-04'],
      priceRupees: 42999,
      tourHref: '/tour/ladakh-high-passes',
    });
  });

  it('[U11] a signed-in traveller with an upcoming paid booking gets booked, with the IST day', () => {
    expect(bookingPanelProps({ ...base, bookedDay: '2027-07-17' })).toEqual({
      status: 'booked',
      bookedDate: '2027-07-17',
    });
  });

  it('[U11] with no start date after today the panel shows no-dates', () => {
    expect(
      bookingPanelProps({ ...base, startDates: ['2026-11-01', '2026-11-16'] }),
    ).toEqual({ status: 'no-dates' });
  });

  it('[U11] a start date whose IST day equals today is not listed, and tomorrow’s is', () => {
    const props = bookingPanelProps({
      ...base,
      startDates: ['2026-11-16', '2026-11-17'],
    });

    expect(props).toEqual({
      status: 'bookable',
      dates: ['2026-11-17'],
      priceRupees: 42999,
    });
  });

  it('[U11] the listed start dates are in ascending calendar order, whatever order they came in', () => {
    const props = bookingPanelProps({
      ...base,
      startDates: ['2027-09-04', '2027-06-12', '2027-07-17'],
    });

    expect(props).toMatchObject({
      dates: ['2027-06-12', '2027-07-17', '2027-09-04'],
    });
  });

  it('[U11] the input is not mutated when the dates are ordered', () => {
    const startDates = ['2027-09-04', '2027-06-12'];

    bookingPanelProps({ ...base, startDates });

    expect(startDates).toEqual(['2027-09-04', '2027-06-12']);
  });

  it('[U11] an upcoming booking takes precedence over the bookable state, but not over no-dates', () => {
    expect(bookingPanelProps({ ...base, bookedDay: '2027-06-12' }).status).toBe(
      'booked',
    );
    expect(
      bookingPanelProps({
        ...base,
        bookedDay: '2027-06-12',
        startDates: ['2026-01-01'],
      }).status,
    ).toBe('no-dates');
  });
});
