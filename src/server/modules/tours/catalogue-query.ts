import 'server-only';
import type { IstDay } from '@/lib/ist';
import type { TourSummary } from './dto';

/** One catalogue tour, as the list shows it. */
export type CatalogueEntry = TourSummary;

/** A parsed list query. The query module never reads the URL itself. */
export type CatalogueQuery = {
  /**
   * Sort tokens: a field name, prefixed with `-` for descending. Name and then
   * id always follow as the tie-breaks (B1), whatever the tokens are.
   */
  sort: string[];
  /** One-based. */
  page: number;
  limit: number;
  /**
   * true on `/`: a page past the end is clamped to the last page (B11).
   * false on the API: a page past the end answers an empty list with the real total.
   */
  clampPage: boolean;
};

export type TourListResult = {
  items: CatalogueEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type SortField =
  | 'price'
  | 'ratingsAverage'
  | 'duration'
  | 'maxGroupSize'
  | 'name'
  | 'createdAt';

// Strings compare by code unit, so the order is the same on every machine.
function compare(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const left = String(a);
  const right = String(b);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function comparatorFor(
  token: string,
): (a: CatalogueEntry, b: CatalogueEntry) => number {
  const descending = token.startsWith('-');
  const field = (descending ? token.slice(1) : token) as SortField;
  return (a, b) => {
    const order = compare(a[field], b[field]);
    return descending ? -order : order;
  };
}

/**
 * Sorts, counts, pages and clamps a catalogue. Pure: it never reads the database
 * or the clock, and it never changes `entries`, which may be a shared cache value.
 *
 * @param entries - Every catalogue tour, in any order.
 * @param query - The sort tokens, page, limit and clamp flag.
 * @returns The page of items, the total before paging, and the page numbers used.
 */
export function applyCatalogueQuery(
  entries: readonly CatalogueEntry[],
  query: CatalogueQuery,
): TourListResult {
  const comparators = query.sort.map(comparatorFor);
  const sorted = [...entries].sort((a, b) => {
    for (const byToken of comparators) {
      const order = byToken(a, b);
      if (order !== 0) return order;
    }
    return compare(a.name, b.name) || compare(a.id, b.id);
  });
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const page = query.clampPage
    ? Math.max(1, Math.min(query.page, totalPages))
    : query.page;
  const start = (page - 1) * query.limit;
  return {
    items: sorted.slice(start, start + query.limit),
    total,
    page,
    limit: query.limit,
    totalPages,
  };
}

/**
 * D-03: the earliest start date whose IST day is after today's, or null when no
 * departure is left. Day strings compare in calendar order.
 */
export function nextBookableDate(
  startDates: readonly IstDay[],
  today: IstDay,
): IstDay | null {
  let next: IstDay | null = null;
  for (const day of startDates) {
    if (day > today && (next === null || day < next)) next = day;
  }
  return next;
}
