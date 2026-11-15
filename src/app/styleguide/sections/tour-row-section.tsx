import { TourRow } from '@/components/ui/tour-row';
import keralaCover from '../../../../seed/img/tours/kerala-backwaters-and-hills-cover.jpg';
import valleyCover from '../../../../seed/img/tours/valley-of-flowers-trek-cover.jpg';
import styles from '../styleguide.module.css';

// Real seed tours from seed/data/tours.json, so the row shows real names, places, dates and prices (plan.md §9.1).
export function TourRowSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-tour-row">
      <h2 id="styleguide-tour-row">Tour row</h2>
      <p className={styles.note}>
        One tour in the overview list. The whole row is a link. Below 64em the
        date and price sit under the name; at 64em and up they sit on the right.
      </p>
      <ul className={styles.rows}>
        <TourRow
          name="Valley of Flowers Trek"
          location="Rishikesh, Uttarakhand"
          photoUrl={valleyCover.src}
          lengthDays={6}
          difficulty="medium"
          startDate="2027-07-10"
          priceRupees={18999}
          href="/tours/valley-of-flowers-trek"
        />
        <TourRow
          name="Kerala Backwaters and Hills"
          location="Fort Kochi, Kerala"
          photoUrl={keralaCover.src}
          lengthDays={5}
          difficulty="easy"
          startDate="2026-12-05"
          priceRupees={24999}
          href="/tours/kerala-backwaters-and-hills"
        />
      </ul>
    </section>
  );
}
