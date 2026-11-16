import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { PageQuery } from '@/lib/tour-list-url';
import styles from './tour-filters.module.css';

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Any difficulty' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'difficult', label: 'Difficult' },
];

type TourFiltersProps = {
  query: PageQuery;
  /** Rendered open when a filter is active or the sort is not the default (D-01). */
  open: boolean;
};

// The one GET form on `/` (D-05): no client JavaScript, so it works with JavaScript off and every result is a shareable URL.
export function TourFilters({ query, open }: TourFiltersProps) {
  return (
    <details className={styles.disclosure} open={open}>
      <summary className={styles.summary}>Filters</summary>
      <form
        method="get"
        action="/"
        aria-label="Filter tours"
        className={styles.form}
      >
        <Select
          label="Difficulty"
          name="difficulty"
          options={DIFFICULTY_OPTIONS}
          defaultValue={query.difficulty ?? ''}
        />
        <Button type="submit">Show tours</Button>
      </form>
    </details>
  );
}
