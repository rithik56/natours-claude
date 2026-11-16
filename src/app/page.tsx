import type { Metadata } from 'next';
import { TourFilters } from '@/components/features/tour-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { TourRow } from '@/components/ui/tour-row';
import { parseQuery } from '@/server/api/parse-query';
import { now } from '@/server/clock';
import { getConfig } from '@/server/config';
import { getDeps } from '@/server/deps';
import { nextBookableDate } from '@/server/modules/tours/catalogue-query';
import {
  buildPageQuerySchema,
  LENGTH_BANDS,
} from '@/server/modules/tours/schemas';
import { list, monthOptions } from '@/server/modules/tours/service';
import { toIstDay } from '@/lib/ist';
import {
  activeFilterCount,
  DEFAULT_SORT,
  listHref,
  type PageQuery,
} from '@/lib/tour-list-url';
import styles from './page.module.css';

// UI-SPEC Open item 13: the canonical is always the origin plus `/`, whatever the query.
// Built inside the function so the config is read on use, never at module scope (ARC-07).
export function generateMetadata(): Metadata {
  return {
    title: 'Small-group tours across India',
    description:
      'Small-group tours across India, from the high passes of Ladakh to the backwaters of Kerala.',
    alternates: { canonical: `${getConfig().appOrigin}/` },
  };
}

// D-05: `/` reads its filters from the URL (lenient: a bad value falls back to its default) and calls list() directly (R3), never /api.
export default async function HomePage(props: PageProps<'/'>) {
  const search = await props.searchParams;
  const months = await monthOptions();
  const query: PageQuery = parseQuery(buildPageQuerySchema(months), search);

  const result = await list({
    sort: [query.sort],
    page: query.page,
    limit: query.limit,
    clampPage: true,
    difficulty: query.difficulty,
    lengthBand: query.length ? LENGTH_BANDS[query.length] : undefined,
    maxPrice: query.maxPrice,
    month: query.month,
  });
  const today = toIstDay(now());
  const count = result.total === 1 ? '1 tour' : `${result.total} tours`;
  const filtersOpen =
    activeFilterCount(query) > 0 || query.sort !== DEFAULT_SORT;

  return (
    <div className={styles.section}>
      <h1>Find your next trip</h1>
      <TourFilters query={query} months={months} open={filtersOpen} />
      <p className={styles.count}>{count}</p>
      {result.items.length === 0 ? (
        <EmptyState
          message="No tours match these filters."
          action={{ label: 'Clear filters', href: '/' }}
        />
      ) : (
        <ul className={styles.list}>
          {result.items.map((tour, index) => (
            <TourRow
              key={tour.id}
              name={tour.name}
              location={tour.startLocation.address}
              photoUrl={getDeps().storage.urlFor(tour.imageCover)}
              lengthDays={tour.duration}
              difficulty={tour.difficulty}
              startDate={nextBookableDate(tour.startDates, today) ?? undefined}
              priceRupees={tour.price}
              href={`/tour/${tour.slug}`}
              // C2: the first photo on the page is the likely LCP image, so only it is preloaded.
              preload={index === 0}
            />
          ))}
        </ul>
      )}
      {result.totalPages > 1 ? (
        <Pagination
          label="Tour pages"
          page={result.page}
          totalPages={result.totalPages}
          previousHref={listHref(query, { page: result.page - 1 })}
          nextHref={listHref(query, { page: result.page + 1 })}
        />
      ) : null}
    </div>
  );
}
