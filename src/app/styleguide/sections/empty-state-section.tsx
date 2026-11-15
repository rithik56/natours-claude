import { EmptyState } from '@/components/ui/empty-state';
import styles from '../styleguide.module.css';

// The wording is from docs/design/copy.md and docs/design/direction.md: the fact, then the one action.
export function EmptyStateSection() {
  return (
    <section
      className={styles.section}
      aria-labelledby="styleguide-empty-state"
    >
      <h2 id="styleguide-empty-state">Empty state</h2>
      <p className={styles.note}>
        The fact, then the one action that resolves it. There is no empty state
        without an action.
      </p>
      <ul className={styles.states}>
        <li className={styles.state}>
          <span className={styles.label}>Overview with no matching tours</span>
          <EmptyState
            message="No tours match these filters."
            action={{ label: 'Clear filters', href: '/' }}
          />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>My tours with no upcoming tours</span>
          <EmptyState
            message="No upcoming tours yet."
            action={{ label: 'See all tours', href: '/' }}
          />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>My tours with no past tours</span>
          <EmptyState
            message="No past tours yet."
            action={{ label: 'See all tours', href: '/' }}
          />
        </li>
      </ul>
    </section>
  );
}
