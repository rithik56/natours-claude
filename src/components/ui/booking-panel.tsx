import Link from 'next/link';
import { formatDate, formatPrice } from '@/lib/format';
import { Button } from './button';
import styles from './booking-panel.module.css';

// Dates are calendar days in India Standard Time, as YYYY-MM-DD strings from the seed data.
type BookablePanel = {
  status: 'bookable';
  dates: string[];
  priceRupees: number;
};

type LoggedOutPanel = {
  status: 'logged-out';
  dates: string[];
  priceRupees: number;
  tourHref: string;
};

type BookedPanel = {
  status: 'booked';
  bookedDate: string;
};

type NoDatesPanel = {
  status: 'no-dates';
};

export type BookingPanelProps =
  BookablePanel | LoggedOutPanel | BookedPanel | NoDatesPanel;

// The login link returns the user to this tour, so the path is percent-encoded into `next` (S22).
function loginHref(tourHref: string): string {
  return `/login?next=${encodeURIComponent(tourHref)}`;
}

function DateAndPrice({
  dates,
  priceRupees,
}: {
  dates: string[];
  priceRupees: number;
}) {
  return (
    <>
      <label className={styles.field}>
        <span>Start date</span>
        <select name="startDate" className={styles.select}>
          {dates.map((date) => (
            <option key={date} value={date}>
              {formatDate(date)}
            </option>
          ))}
        </select>
      </label>
      <p className={styles.price}>{formatPrice(priceRupees)} per person</p>
    </>
  );
}

// The booking panel is a pure display component: the four states are chosen by `status`
// alone, and nothing is fetched here. The real booking state comes from Phase 4.
export function BookingPanel(props: BookingPanelProps) {
  return (
    <aside className={styles.panel} aria-label="Book this tour">
      {props.status === 'bookable' ? (
        <>
          <DateAndPrice dates={props.dates} priceRupees={props.priceRupees} />
          <Button variant="primary">Book this tour</Button>
        </>
      ) : null}
      {props.status === 'logged-out' ? (
        <>
          <DateAndPrice dates={props.dates} priceRupees={props.priceRupees} />
          <Link className={styles.action} href={loginHref(props.tourHref)}>
            Log in to book
          </Link>
        </>
      ) : null}
      {props.status === 'booked' ? (
        <p className={styles.booked}>
          You’re booked for {formatDate(props.bookedDate)}.{' '}
          <Link href="/my-tours">My tours</Link>
        </p>
      ) : null}
      {props.status === 'no-dates' ? (
        <p className={styles.empty}>No upcoming start dates for this tour.</p>
      ) : null}
    </aside>
  );
}
