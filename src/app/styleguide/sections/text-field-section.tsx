import { TextField } from '@/components/ui/text-field';
import styles from '../styleguide.module.css';

// Seed content from seed/data/users.json. The seed uses the reserved example.com domain.
const seedEmail = 'aarav.sharma@example.com';

// Each field has a unique label and name, so the section never holds two fields with the same id.
export function TextFieldSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-text-field">
      <h2 id="styleguide-text-field">Text field</h2>
      <p className={styles.note}>
        Every field has a visible label. An error appears under its field and is
        linked to the field for screen readers.
      </p>
      <ul className={styles.states}>
        <li className={styles.state}>
          <span className={styles.label}>Default. At rest, empty.</span>
          <TextField label="Full name" name="full-name" />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Filled. Holds a value.</span>
          <TextField
            label="Email"
            name="contact-email"
            type="email"
            autoComplete="email"
            defaultValue={seedEmail}
          />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>
            Focus. Press Tab into the field until the ring appears.
          </span>
          <TextField label="Traveller name" name="traveller-name" />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Disabled. Cannot be edited.</span>
          <TextField
            label="Booking contact"
            name="booking-contact"
            defaultValue="Aarav Sharma"
            disabled
          />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>
            Error. Shows the field-validation wording from copy.md.
          </span>
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue="aarav.sharma"
            errorMessage="Enter a valid email address."
          />
        </li>
      </ul>
    </section>
  );
}
