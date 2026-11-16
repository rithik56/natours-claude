import 'server-only';
import type { IstDay } from '@/lib/ist';
import type { TourSummary } from './dto';

/** One catalogue tour, as the list shows it. */
export type CatalogueEntry = TourSummary;

type Difficulty = CatalogueEntry['difficulty'];

/** The numeric fields the API may filter on (S7). */
type NumericField = 'price' | 'duration' | 'ratingsAverage' | 'maxGroupSize';

/** `eq` is plain equality; the others are the bracketed operators (price[gte] and so on). */
type NumericOp = 'eq' | 'gte' | 'gt' | 'lte' | 'lt';

export type CatalogueFilter = {
  field: NumericField;
  op: NumericOp;
  value: number;
};

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
  difficulty?: Difficulty;
  /** An inclusive range of whole days, such as [3, 4] (D-02). */
  lengthBand?: readonly [number, number];
  /** An inclusive ceiling in whole rupees, such as 20000 (D-02). */
  maxPrice?: number;
  /** YYYY-MM. A tour matches when it has a bookable departure in that IST month (D-04). */
  month?: string;
  /** Numeric filters from the API, all of which must hold (S7). */
  filters?: readonly CatalogueFilter[];
};

export type TourListResult = {
  items: CatalogueEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** A catalogue tour with only the fields the caller asked for, and always its id. */
export type ProjectedEntry = Partial<CatalogueEntry> &
  Pick<CatalogueEntry, 'id'>;

type SortField =
  | 'price'
  | 'ratingsAverage'
  | 'duration'
  | 'maxGroupSize'
  | 'name'
  | 'createdAt';

const OPERATORS: Record<NumericOp, (value: number, bound: number) => boolean> =
  {
    eq: (value, bound) => value === bound,
    gte: (value, bound) => value >= bound,
    gt: (value, bound) => value > bound,
    lte: (value, bound) => value <= bound,
    lt: (value, bound) => value < bound,
  };

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

/** Every filter the query names must hold. Each is inclusive where the plan says so. */
function matches(
  entry: CatalogueEntry,
  query: CatalogueQuery,
  today: IstDay,
): boolean {
  if (query.difficulty !== undefined && entry.difficulty !== query.difficulty) {
    return false;
  }
  if (query.lengthBand !== undefined) {
    const [min, max] = query.lengthBand;
    if (entry.duration < min || entry.duration > max) return false;
  }
  if (query.maxPrice !== undefined && entry.price > query.maxPrice)
    return false;
  for (const filter of query.filters ?? []) {
    if (!OPERATORS[filter.op](entry[filter.field], filter.value)) return false;
  }
  if (query.month !== undefined) {
    const prefix = `${query.month}-`;
    const bookable = entry.startDates.some(
      (day) => day > today && day.startsWith(prefix),
    );
    if (!bookable) return false;
  }
  return true;
}

/**
 * Filters, sorts, counts, pages and clamps a catalogue. Pure: it never reads the
 * database or the clock, and it never changes `entries`, which may be a shared cache value.
 *
 * @param entries - Every catalogue tour, in any order.
 * @param query - The filters, sort tokens, page, limit and clamp flag.
 * @param today - The IST day a departure must be after to be bookable (D-03).
 * @returns The page of items, the total before paging, and the page numbers used.
 */
export function applyCatalogueQuery(
  entries: readonly CatalogueEntry[],
  query: CatalogueQuery,
  today: IstDay,
): TourListResult {
  const comparators = query.sort.map(comparatorFor);
  const sorted = entries
    .filter((entry) => matches(entry, query, today))
    .sort((a, b) => {
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

/**
 * D-04: the months, YYYY-MM and ascending, that have at least one bookable
 * departure in the catalogue. Only months after today count.
 */
export function monthOptionsFrom(
  entries: readonly CatalogueEntry[],
  today: IstDay,
): string[] {
  const months = new Set<string>();
  for (const entry of entries) {
    for (const day of entry.startDates) {
      if (day > today) months.add(day.slice(0, 7));
    }
  }
  return [...months].sort();
}

/** One row of the tour statistics (F1): the tours of one difficulty and their figures. */
export type DifficultyStats = {
  difficulty: Difficulty;
  numTours: number;
  /** The sum of the tours' rating counts. */
  numRatings: number;
  /** The mean of the tours' average ratings, to one decimal place. */
  avgRating: number;
  /** The mean price, in whole rupees. */
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
};

const DIFFICULTY_ORDER: readonly Difficulty[] = ['easy', 'medium', 'difficult'];

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Rounds half up to `places` decimal places. The product is first trimmed to 12
 * significant digits, so a float such as 4.6499999999999995 rounds as 4.65 does.
 */
function roundHalfUp(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(Number((value * scale).toPrecision(12))) / scale;
}

/**
 * One row per difficulty that has tours, in the order easy, medium, difficult (F1).
 * Pure: it reads the entries it is given and changes nothing, so the figures always
 * agree with the catalogue the list reads.
 *
 * @param entries - Every catalogue tour, in any order.
 * @returns The rows for the difficulties present; an empty array for an empty catalogue.
 */
export function statsFrom(
  entries: readonly CatalogueEntry[],
): DifficultyStats[] {
  return DIFFICULTY_ORDER.flatMap((difficulty) => {
    const group = entries.filter((entry) => entry.difficulty === difficulty);
    if (group.length === 0) return [];
    const prices = group.map((entry) => entry.price);
    return [
      {
        difficulty,
        numTours: group.length,
        numRatings: group.reduce(
          (sum, entry) => sum + entry.ratingsQuantity,
          0,
        ),
        avgRating: roundHalfUp(
          mean(group.map((entry) => entry.ratingsAverage)),
          1,
        ),
        avgPrice: roundHalfUp(mean(prices), 0),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
      },
    ];
  });
}

/**
 * The API's `fields` projection (B11). It copies TourSummary keys only, never the
 * stored document, so no hidden field can be asked for (T-04-14).
 */
export function projectFields(
  items: readonly CatalogueEntry[],
  fields: readonly (keyof CatalogueEntry)[],
): ProjectedEntry[] {
  const keep = new Set<keyof CatalogueEntry>(['id', ...fields]);
  return items.map((item) => {
    const picked: Record<string, unknown> = {};
    for (const field of keep) picked[field] = item[field];
    return picked as ProjectedEntry;
  });
}
