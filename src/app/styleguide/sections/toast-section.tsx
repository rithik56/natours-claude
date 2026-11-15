import { Toast } from '@/components/ui/toast';
import styles from '../styleguide.module.css';

// The toast leaves after five seconds, so reload the page to see it again.
export function ToastSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-toast">
      <h2 id="styleguide-toast">Toast</h2>
      <p className={styles.note}>
        Auto-dismisses after 5 seconds, or press Dismiss to close it early. It
        sits in a polite live region, so screen readers announce it without
        interrupting. Reload the page to see it again.
      </p>
      <Toast
        message="Review posted for Kerala Backwaters and Hills."
        variant="success"
      />
    </section>
  );
}
