import { Itinerary } from '@/components/ui/itinerary';
import styles from '../styleguide.module.css';

// The six days of the Valley of Flowers Trek, from seed/data/tours.json (plan.md §9.1).
const valleyOfFlowersDays = [
  { day: 1, summary: 'Drive along the Alaknanda river to Joshimath' },
  { day: 2, summary: 'Drive to Govindghat, then walk up to Ghangaria' },
  { day: 3, summary: 'A full day in the Valley of Flowers' },
  { day: 4, summary: 'Climb to Gurdwara Hemkund Sahib and its glacial lake' },
  { day: 5, summary: 'Walk down to Govindghat and drive to Joshimath' },
  { day: 6, summary: 'Drive back to Rishikesh' },
];

export function ItinerarySection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-itinerary">
      <h2 id="styleguide-itinerary">Itinerary</h2>
      <p className={styles.note}>
        The day-by-day list on a tour page. The &ldquo;Day N&rdquo; labels are
        the only numbers in the product: the list adds no counter of its own.
      </p>
      <Itinerary days={valleyOfFlowersDays} />
    </section>
  );
}
