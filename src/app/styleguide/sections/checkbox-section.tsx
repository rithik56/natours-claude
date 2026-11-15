import { Checkbox } from '@/components/ui/checkbox';
import styles from '../styleguide.module.css';

// Each checkbox has a unique label and name. The whole label is the click target, and it is 44px at least.
export function CheckboxSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-checkbox">
      <h2 id="styleguide-checkbox">Checkbox</h2>
      <p className={styles.note}>
        A native checkbox. Clicking its label, or any part of the target, ticks
        it.
      </p>
      <ul className={styles.states}>
        <li className={styles.state}>
          <span className={styles.label}>
            Unchecked. Click the label to tick it.
          </span>
          <Checkbox label="Show only Himalayan tours" name="himalayan-only" />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Checked. Starts ticked.</span>
          <Checkbox
            label="Show tours with seats left"
            name="seats-left"
            defaultChecked
          />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>
            Focus. Press Tab until the ring appears, then Space to tick it.
          </span>
          <Checkbox
            label="Show tours that start this month"
            name="starts-this-month"
          />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Disabled. Cannot be changed.</span>
          <Checkbox
            label="Show only tours in Ladakh"
            name="ladakh-only"
            disabled
          />
        </li>
      </ul>
    </section>
  );
}
