import { toIstDay } from '@/lib/ist';
import {
  activeFilterCount,
  DEFAULT_SORT,
  type PageQuery,
} from '@/lib/tour-list-url';
import { TourFilters } from '@/components/features/tour-filters';
import { TourRow } from '@/components/ui/tour-row';
import { parseQuery } from '@/server/api/parse-query';
import { now } from '@/server/clock';
import { getDeps } from '@/server/deps';
import { nextBookableDate } from '@/server/modules/tours/catalogue-query';
import {
  buildPageQuerySchema,
  LENGTH_BANDS,
} from '@/server/modules/tours/schemas';
import { list, monthOptions } from '@/server/modules/tours/service';

// D-05: `/` reads its filters from the URL (lenient: a bad value falls back to its default) and calls list() directly (R3), never /api.
export default async function HomePage(props: PageProps<'/'>) {
  const search = await props.searchParams;
  const query: PageQuery = parseQuery(
    buildPageQuerySchema(await monthOptions()),
    search,
  );

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
    <div>
      <h1>Find your next trip</h1>
      <TourFilters query={query} open={filtersOpen} />
      <p>{count}</p>
      <ul>
        {result.items.map((tour) => (
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
          />
        ))}
      </ul>
    </div>
  );
}
