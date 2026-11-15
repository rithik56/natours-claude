import {
  BookingPanel,
  type BookingPanelProps,
} from '@/components/ui/booking-panel';
import styles from '../styleguide.module.css';

// Ladakh High Passes, from seed/data/tours.json: its price and its three start dates.
const ladakhDates = ['2027-06-12', '2027-07-17', '2027-09-04'];
const ladakhPrice = 42999;
const ladakhHref = '/tour/ladakh-high-passes';

const states: { name: string; panel: BookingPanelProps }[] = [
  {
    name: 'Bookable: logged in, not yet booked',
    panel: {
      status: 'bookable',
      dates: ladakhDates,
      priceRupees: ladakhPrice,
    },
  },
  {
    name: 'Logged out',
    panel: {
      status: 'logged-out',
      dates: ladakhDates,
      priceRupees: ladakhPrice,
      tourHref: ladakhHref,
    },
  },
  {
    name: 'Already booked',
    panel: { status: 'booked', bookedDate: '2027-07-17' },
  },
  {
    name: 'No upcoming start dates',
    panel: { status: 'no-dates' },
  },
];

export function BookingPanelSection() {
  return (
    <section
      className={styles.section}
      aria-labelledby="styleguide-booking-panel"
    >
      <h2 id="styleguide-booking-panel">Booking panel</h2>
      <p className={styles.note}>
        Four states, chosen by the status alone. The panel fetches nothing.
      </p>
      <ul className={styles.states}>
        {states.map(({ name, panel }) => (
          <li key={name} className={styles.state}>
            <span className={styles.label}>{name}</span>
            <BookingPanel {...panel} />
          </li>
        ))}
      </ul>
    </section>
  );
}
