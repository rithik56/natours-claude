import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/link';
import { Select } from '@/components/ui/select';
import { formatMonth, formatPrice } from '@/lib/format';
import {
  activeFilterCount,
  DEFAULT_SORT,
  type PageQuery,
} from '@/lib/tour-list-url';
import { PRICE_BANDS } from '@/server/modules/tours/schemas';
import styles from './tour-filters.module.css';

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Any difficulty' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'difficult', label: 'Difficult' },
];

const LENGTH_OPTIONS = [
  { value: '', label: 'Any length' },
  { value: '3-4', label: '3 to 4 days' },
  { value: '5-6', label: '5 to 6 days' },
  { value: '7-8', label: '7 to 8 days' },
];

const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  ...PRICE_BANDS.map((rupees) => ({
    value: String(rupees),
    label: `Up to ${formatPrice(rupees)}`,
  })),
];

const SORT_OPTIONS = [
  { value: '-ratingsAverage', label: 'Rating, highest first' },
  { value: 'price', label: 'Price, low to high' },
  { value: '-price', label: 'Price, high to low' },
  { value: 'duration', label: 'Length, shortest first' },
  { value: '-duration', label: 'Length, longest first' },
];

type TourFiltersProps = {
  query: PageQuery;
  /** The bookable months, YYYY-MM, from monthOptions() (D-04). */
  months: readonly string[];
  /** Rendered open when a filter is active or the sort is not the default (D-01). */
  open: boolean;
};

// The one GET form on `/` (D-05): no client JavaScript, so it works with JavaScript off and every result is a shareable URL.
export function TourFilters({ query, months, open }: TourFiltersProps) {
  const active = activeFilterCount(query);
  const sortChanged = query.sort !== DEFAULT_SORT;
  const monthOptions = [
    { value: '', label: 'Any month' },
    ...months.map((month) => ({ value: month, label: formatMonth(month) })),
  ];

  return (
    <details className={styles.disclosure} open={open}>
      <summary className={styles.summary}>
        Filters
        {active > 0 ? (
          <>
            {' '}
            <span className={styles.count}>({active} active)</span>
          </>
        ) : null}
      </summary>
      <form
        method="get"
        action="/"
        aria-label="Filter tours"
        className={styles.form}
      >
        <div className={styles.fields}>
          <Select
            label="Difficulty"
            name="difficulty"
            options={DIFFICULTY_OPTIONS}
            defaultValue={query.difficulty ?? ''}
          />
          <Select
            label="Length"
            name="length"
            options={LENGTH_OPTIONS}
            defaultValue={query.length ?? ''}
          />
          <Select
            label="Month"
            name="month"
            options={monthOptions}
            defaultValue={query.month ?? ''}
          />
          <Select
            label="Max price"
            name="maxPrice"
            options={PRICE_OPTIONS}
            defaultValue={
              query.maxPrice === undefined ? '' : String(query.maxPrice)
            }
          />
          <Select
            label="Sort"
            name="sort"
            options={SORT_OPTIONS}
            defaultValue={query.sort}
          />
        </div>
        <div className={styles.actions}>
          <Button type="submit">Show tours</Button>
          {active > 0 || sortChanged ? (
            <Link href="/" className={styles.clear}>
              Clear filters
            </Link>
          ) : null}
        </div>
      </form>
    </details>
  );
}
