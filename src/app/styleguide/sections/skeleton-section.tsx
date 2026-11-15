import { Skeleton } from '@/components/ui/skeleton';
import styles from '../styleguide.module.css';

// Each variant is boxed in a test id wrapper so the spec can measure it against the real component above.
export function SkeletonSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-skeleton">
      <h2 id="styleguide-skeleton">Skeleton</h2>
      <p className={styles.note}>
        A still placeholder for each streamed section, with no animation. Each
        named variant is the size of the real review item, guide item or booking
        panel, so the real content replaces it without moving the page.
      </p>
      <h3>Text, at its own width and at a set width and height</h3>
      <div className={styles.states}>
        <div data-testid="skeleton-text">
          <Skeleton />
        </div>
        <div data-testid="skeleton-sized">
          <Skeleton width="12rem" height="3rem" />
        </div>
      </div>
      <h3>Review item</h3>
      <div className={styles.states}>
        <div data-testid="skeleton-review-item">
          <Skeleton variant="review-item" />
        </div>
      </div>
      <h3>Guide item</h3>
      <div className={styles.states}>
        <div data-testid="skeleton-guide-item">
          <Skeleton variant="guide-item" />
        </div>
      </div>
      <h3>Booking panel</h3>
      <ul className={styles.states}>
        <li className={styles.state}>
          <div data-testid="skeleton-booking-panel">
            <Skeleton variant="booking-panel" />
          </div>
        </li>
      </ul>
    </section>
  );
}
