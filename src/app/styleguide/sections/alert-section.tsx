import { Alert } from '@/components/ui/alert';
import styles from '../styleguide.module.css';

// The wording is copy.md's: the actual problem, then the next step, with no apology.
export function AlertSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-alert">
      <h2 id="styleguide-alert">Alert</h2>
      <p className={styles.note}>
        Three variants. An error is announced at once; success and info are
        status updates.
      </p>
      <ul className={styles.states}>
        <li className={styles.state}>
          <span className={styles.label}>Error, role alert</span>
          <Alert variant="error">
            Check the highlighted fields and try again.
          </Alert>
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Success, role status</span>
          <Alert variant="success">Your changes are saved.</Alert>
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Info, role status</span>
          <Alert variant="info">
            Start dates are shown in India Standard Time.
          </Alert>
        </li>
      </ul>
    </section>
  );
}
