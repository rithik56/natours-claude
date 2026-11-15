import { Link } from './link';
import styles from './pagination.module.css';

type PaginationProps = {
  page: number;
  totalPages: number;
  previousHref?: string;
  nextHref?: string;
  label?: string;
};

// DES-15: text only. Previous, Next and "Page N of M" say where the reader is; no numbered page buttons exist.
// Without an earlier or later page the control stays in place as a disabled span, since Link needs an href.
export function Pagination({
  page,
  totalPages,
  previousHref,
  nextHref,
  label = 'Pagination',
}: PaginationProps) {
  return (
    <nav className={styles.pagination} aria-label={label}>
      {page > 1 && previousHref !== undefined ? (
        <Link href={previousHref} className={styles.control}>
          Previous
        </Link>
      ) : (
        <span
          className={`${styles.control} ${styles.disabled}`}
          aria-disabled="true"
        >
          Previous
        </span>
      )}
      <span className={styles.status}>
        Page {page} of {totalPages}
      </span>
      {page < totalPages && nextHref !== undefined ? (
        <Link href={nextHref} className={styles.control}>
          Next
        </Link>
      ) : (
        <span
          className={`${styles.control} ${styles.disabled}`}
          aria-disabled="true"
        >
          Next
        </span>
      )}
    </nav>
  );
}
