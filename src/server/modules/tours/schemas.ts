import 'server-only';
import { z } from '@/server/validation';
import type { CatalogueFilter, CatalogueQuery } from './catalogue-query';

/** The sorts `/` offers (D-03). The API's default is -createdAt; the page's is -ratingsAverage. */
export const PAGE_SORTS = [
  '-ratingsAverage',
  'price',
  '-price',
  'duration',
  '-duration',
] as const;

/** D-02: each band is an inclusive range of whole days. */
export const LENGTH_BANDS = {
  '3-4': [3, 4],
  '5-6': [5, 6],
  '7-8': [7, 8],
} as const;

/** D-02: each maximum price is inclusive, in whole rupees. */
export const PRICE_BANDS = [20000, 30000, 40000] as const;

const DIFFICULTIES = ['easy', 'medium', 'difficult'] as const;

const FILTER_FIELDS = [
  'price',
  'duration',
  'ratingsAverage',
  'maxGroupSize',
] as const;

const FILTER_OPERATORS = ['gte', 'gt', 'lte', 'lt'] as const;

const TOUR_FIELDS = [
  'id',
  'name',
  'slug',
  'duration',
  'maxGroupSize',
  'difficulty',
  'price',
  'ratingsAverage',
  'ratingsQuantity',
  'summary',
  'imageCover',
  'startDates',
  'createdAt',
  'startLocation',
] as const;

type TourField = (typeof TOUR_FIELDS)[number];

/** A numeric filter key as the API spells it: `price`, or `price[gte]` and the other operators. */
type FilterKey =
  | (typeof FILTER_FIELDS)[number]
  | `${(typeof FILTER_FIELDS)[number]}[${(typeof FILTER_OPERATORS)[number]}]`;

const POSITIVE_INTEGER = /^[1-9]\d*$/;
const WHOLE_NUMBER = /^\d+$/;
const FRACTION = /^\d+\.\d+$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
// Each sort token is one field, optionally descending. Literal, so the field list is checked here.
const SORT_TOKEN =
  /^-?(price|ratingsAverage|duration|maxGroupSize|name|createdAt)$/;
const SORT_TOKEN_FIELD = /^-/;

const MAX_SORT_TOKENS = 5;
const MAX_LIMIT = 100;

const PRICE_BAND_TEXT: readonly string[] = PRICE_BANDS.map(String);
const LENGTH_BAND_KEYS = Object.keys(LENGTH_BANDS) as [
  keyof typeof LENGTH_BANDS,
  ...(keyof typeof LENGTH_BANDS)[],
];

// Strict API sort: at most five tokens, each a known field, optionally descending, and no field twice (B1).
function isValidSortList(value: string): boolean {
  const tokens = value.split(',');
  if (tokens.length > MAX_SORT_TOKENS) return false;
  const fields = new Set<string>();
  for (const token of tokens) {
    if (!SORT_TOKEN.test(token)) return false;
    const field = token.replace(SORT_TOKEN_FIELD, '');
    if (fields.has(field)) return false;
    fields.add(field);
  }
  return true;
}

const TOUR_FIELD_SET: ReadonlySet<string> = new Set(TOUR_FIELDS);

function isValidFieldList(value: string): boolean {
  return value.split(',').every((field) => TOUR_FIELD_SET.has(field));
}

// Digits only, so 1.5, 1e1, +2 and values with spaces are refused (B11 precision).
const positiveInteger = z.string().regex(POSITIVE_INTEGER).transform(Number);

// A numeric filter value: a plain non-negative number, such as 12999 or 4.5. No sign, no exponent.
const filterNumber = z
  .string()
  .refine((value) => WHOLE_NUMBER.test(value) || FRACTION.test(value))
  .transform(Number);

/** `/` reads its query leniently: a bad value falls back to its default (plan.md 4.3). */
export function buildPageQuerySchema(monthValues: readonly string[]) {
  return z.object({
    difficulty: z.enum(DIFFICULTIES).optional(),
    length: z.enum(LENGTH_BAND_KEYS).optional(),
    month: z
      .string()
      .refine((value) => monthValues.includes(value))
      .optional(),
    maxPrice: z
      .string()
      .refine((value) => PRICE_BAND_TEXT.includes(value))
      .transform(Number)
      .optional(),
    sort: z.enum(PAGE_SORTS).default('-ratingsAverage'),
    page: positiveInteger.default(1),
    limit: positiveInteger.pipe(z.number().max(MAX_LIMIT)).default(12),
  });
}

const filterShape: Record<string, z.ZodType> = {};
for (const field of FILTER_FIELDS) {
  filterShape[field] = filterNumber.optional();
  for (const op of FILTER_OPERATORS) {
    filterShape[`${field}[${op}]`] = filterNumber.optional();
  }
}

/**
 * GET /api/v1/tours reads its query strictly (QA-17): an unknown key, an operator
 * the allowlist does not name, or a bad value is refused with a 400 (S7, B1, B11).
 */
export const apiListQuerySchema = z.strictObject({
  ...filterShape,
  difficulty: z.enum(DIFFICULTIES).optional(),
  month: z.string().regex(MONTH).optional(),
  sort: z
    .string()
    .refine(isValidSortList)
    .transform((value) => value.split(','))
    .optional(),
  fields: z
    .string()
    .refine(isValidFieldList)
    .transform((value) => value.split(',') as TourField[])
    .optional(),
  page: positiveInteger.optional(),
  limit: positiveInteger.pipe(z.number().max(MAX_LIMIT)).optional(),
});

/**
 * Turns a parsed API query into a catalogue query. An absent sort is -createdAt
 * (B1); an absent page is 1 and an absent limit is 20. The API never clamps (B11).
 */
export function toApiCatalogueQuery(
  parsed: z.infer<typeof apiListQuerySchema> &
    Partial<Record<FilterKey, number>>,
): CatalogueQuery {
  const filters: CatalogueFilter[] = [];
  for (const field of FILTER_FIELDS) {
    const equal = parsed[field];
    if (equal !== undefined) filters.push({ field, op: 'eq', value: equal });
    for (const op of FILTER_OPERATORS) {
      const bound = parsed[`${field}[${op}]`];
      if (bound !== undefined) filters.push({ field, op, value: bound });
    }
  }
  return {
    sort: parsed.sort ?? ['-createdAt'],
    page: parsed.page ?? 1,
    limit: parsed.limit ?? 20,
    clampPage: false,
    difficulty: parsed.difficulty,
    month: parsed.month,
    filters,
  };
}
