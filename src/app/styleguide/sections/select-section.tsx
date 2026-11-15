import { Select } from '@/components/ui/select';
import styles from '../styleguide.module.css';

// Seed tours from seed/data/tours.json. Option values are slugs; the labels are the tour names.
const tourOptions = [
  { value: 'valley-of-flowers-trek', label: 'Valley of Flowers Trek' },
  { value: 'kedarkantha-winter-trek', label: 'Kedarkantha Winter Trek' },
  { value: 'ladakh-high-passes', label: 'Ladakh High Passes' },
  { value: 'spiti-valley-star-gazer', label: 'Spiti Valley Star Gazer' },
];

export function SelectSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-select">
      <h2 id="styleguide-select">Select</h2>
      <p className={styles.note}>
        A native select, with the same error wiring as the text field.
      </p>
      <ul className={styles.states}>
        <li className={styles.state}>
          <span className={styles.label}>
            Default. The first tour shows until another is chosen.
          </span>
          <Select label="Tour" name="tour" options={tourOptions} />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>
            With an option chosen. Starts on Ladakh High Passes.
          </span>
          <Select
            label="Preferred tour"
            name="preferred-tour"
            options={tourOptions}
            defaultValue="ladakh-high-passes"
          />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>
            Error. Shows the required-field wording from copy.md.
          </span>
          <Select
            label="Tour to book"
            name="booking-tour"
            options={tourOptions}
            errorMessage="Tour is required."
          />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Disabled. Cannot be changed.</span>
          <Select
            label="Tour already booked"
            name="booked-tour"
            options={tourOptions}
            defaultValue="spiti-valley-star-gazer"
            disabled
          />
        </li>
      </ul>
    </section>
  );
}
