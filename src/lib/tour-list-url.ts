/**
 * The parsed query `/` reads from its URL (plan 04-04's page schema, after the
 * length band and price band have been kept as their URL values). Defined here,
 * not imported, so this module stays free of server-only code.
 */
export type PageQuery = {
  difficulty?: 'easy' | 'medium' | 'difficult';
  length?: '3-4' | '5-6' | '7-8';
  month?: string;
  maxPrice?: number;
  sort: string;
  page: number;
  limit: number;
};

/** D-03: rating order is the default sort on `/`. */
export const DEFAULT_SORT = '-ratingsAverage';
/** U10: twelve tours per page on `/`. */
export const DEFAULT_LIMIT = 12;

// The fixed order every shared URL uses, so the same query always reads the same way.
const KEY_ORDER = [
  'difficulty',
  'length',
  'month',
  'maxPrice',
  'sort',
  'page',
  'limit',
] as const;

function isDefault(key: (typeof KEY_ORDER)[number], value: unknown): boolean {
  if (key === 'sort') return value === DEFAULT_SORT;
  if (key === 'page') return value === 1;
  if (key === 'limit') return value === DEFAULT_LIMIT;
  return false;
}

/**
 * Builds a `/` href from the query with some fields changed. Defaults and empty
 * values are left out, so the default list is always plain `/`.
 *
 * @param query - The parsed query the page is showing.
 * @param patch - Fields to change; a field set to undefined is removed.
 * @returns A path such as `/?difficulty=easy&page=2`.
 */
export function listHref(
  query: PageQuery,
  patch: Partial<PageQuery> = {},
): string {
  const merged: Partial<PageQuery> = { ...query, ...patch };
  const params = new URLSearchParams();
  for (const key of KEY_ORDER) {
    const value: unknown = merged[key];
    if (value === undefined || value === '') continue;
    if (isDefault(key, value)) continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text === '' ? '/' : `/?${text}`;
}

/**
 * How many of the four filters are active (difficulty, length, month, max
 * price). Sort and page do not count (D-01).
 */
export function activeFilterCount(query: PageQuery): number {
  return [query.difficulty, query.length, query.month, query.maxPrice].filter(
    (value) => value !== undefined,
  ).length;
}
