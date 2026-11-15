import { Link } from '@/components/ui/link';
import styles from '../styleguide.module.css';

// Internal and external links, each in its at-rest state. Focus is a pseudo-class, so it is tried by hand with Tab (U5).
export function LinkSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-link">
      <h2 id="styleguide-link">Link</h2>
      <p className={styles.note}>
        An internal link stays in the app. An external link opens in a new tab.
      </p>
      <ul className={styles.states}>
        <li className={styles.state}>
          <span className={styles.label}>
            Internal link, at rest. Press Tab until the ring appears.
          </span>
          <Link href="/credits">Read the photo credits</Link>
        </li>
        <li className={styles.state}>
          <span className={styles.label}>
            External link, at rest. It opens in a new tab.
          </span>
          <Link href="https://creativecommons.org/licenses/by-sa/3.0">
            CC BY-SA 3.0
          </Link>
        </li>
      </ul>
    </section>
  );
}
