import { StartDateSelect } from '@/components/ui/start-date-select';
import styles from '../styleguide.module.css';

// Real start dates from seed/data/tours.json (Valley of Flowers Trek), as IST days.
const valleyOfFlowersDates = ['2027-07-10', '2027-07-31', '2027-08-21'];

export function StartDateSelectSection() {
  return (
    <section
      className={styles.section}
      aria-labelledby="styleguide-start-date-select"
    >
      <h2 id="styleguide-start-date-select">Start date select</h2>
      <p className={styles.note}>
        Each option is a start date, labelled through the date formatter. The
        value is the calendar day in India Standard Time.
      </p>
      <div className={styles.states}>
        <StartDateSelect name="startDate" dates={valleyOfFlowersDates} />
        <StartDateSelect
          name="startDateError"
          dates={valleyOfFlowersDates}
          errorMessage="Start date is required."
        />
        <StartDateSelect name="startDateEmpty" dates={[]} />
      </div>
    </section>
  );
}
