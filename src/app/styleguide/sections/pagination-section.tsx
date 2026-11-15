import { Pagination } from '@/components/ui/pagination';
import styles from '../styleguide.module.css';

// Text only (DES-15): Previous, Next and Page N of M, never numbered page buttons.
export function PaginationSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-pagination">
      <h2 id="styleguide-pagination">Pagination</h2>
      <p className={styles.note}>
        Previous and Next are disabled at the ends of the list, and each keeps
        its place so the layout does not move.
      </p>
      <h3>First page</h3>
      <Pagination
        label="Review pagination, first page"
        page={1}
        totalPages={3}
        nextHref="?page=2"
      />
      <h3>Middle page</h3>
      <Pagination
        label="Review pagination, middle page"
        page={2}
        totalPages={3}
        previousHref="?page=1"
        nextHref="?page=3"
      />
      <h3>Last page</h3>
      <Pagination
        label="Review pagination, last page"
        page={3}
        totalPages={3}
        previousHref="?page=2"
      />
    </section>
  );
}
