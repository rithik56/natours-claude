import 'server-only';
import { fromIstDay } from '@/lib/ist';
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

const SIGNED_WHOLE = /^-?\d+$/;
const SIGNED_FRACTION = /^-?\d+\.\d+$/;

// One coordinate: a whole number or a decimal, with an optional minus sign. No exponent, no spaces.
function isCoordinate(value: string): boolean {
  return SIGNED_WHOLE.test(value) || SIGNED_FRACTION.test(value);
}

/** The largest radius either unit accepts (B3, T-04-29): a nonsense radius is a 400, not a planet-wide query. */
const MAX_DISTANCE = 20000;

/**
 * A `lat,lng` path segment (B3). Latitude is −90 to 90 and longitude −180 to 180, and the
 * ends are accepted. Anything else is refused here, before MongoDB sees it (T-04-29).
 * Yields `{ lat, lng }`.
 */
const latlngSchema = z
  .string()
  .refine((value) => {
    const parts = value.split(',');
    return parts.length === 2 && parts.every(isCoordinate);
  })
  .transform((value) => {
    const [lat, lng] = value.split(',').map(Number);
    return { lat, lng };
  })
  .pipe(
    z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
  );

/** A radius: a number above 0 and at most 20,000, in the unit the path names (B3). */
const distanceSchema = z
  .string()
  .refine((value) => WHOLE_NUMBER.test(value) || FRACTION.test(value))
  .transform(Number)
  .pipe(z.number().gt(0).max(MAX_DISTANCE));

/** The distance unit: miles or kilometres, and nothing else (B3). */
const unitSchema = z.enum(['mi', 'km']);

/** The path of GET /api/v1/tours/within/[distance]/center/[latlng]/unit/[unit] (B3). */
export const withinParamsSchema = z.strictObject({
  distance: distanceSchema,
  latlng: latlngSchema,
  unit: unitSchema,
});

/** The path of GET /api/v1/tours/distances/[latlng]/unit/[unit] (B3). */
export const distancesParamsSchema = z.strictObject({
  latlng: latlngSchema,
  unit: unitSchema,
});

const YEAR_DIGITS = /^\d{4}$/;

/**
 * The path of GET /api/v1/tours/monthly-plan/[year] (F2): four digits, from 2000 to 2100.
 * `abc`, `2027.5`, `1999` and `2101` are each a 400 before any read.
 */
export const monthlyPlanParamsSchema = z.strictObject({
  year: z
    .string()
    .regex(YEAR_DIGITS)
    .transform(Number)
    .pipe(z.number().int().min(2000).max(2100)),
});

// The editable tour fields (B4, S4). Create and update share these rules, so a field means the
// same thing on both routes. Every object is strict: an unknown key is a 400 naming its path.
// Images, credits, the slug and the ratings are not in these schemas, so no JSON body can write them.
const TOUR_NAME = z.string().trim().min(10).max(40);
const TOUR_TEXT = z.string().trim().min(1);
const POSITIVE_WHOLE = z.number().int().min(1);
const OBJECT_ID_HEX = /^[0-9a-f]{24}$/i;

/** [longitude, latitude], each in range. GeoJSON order, as the model stores it. */
const lngLat = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

/** A calendar day in IST, `YYYY-MM-DD`, that `fromIstDay` accepts (B19). */
const istDay = z.string().refine((value) => {
  try {
    fromIstDay(value);
    return true;
  } catch {
    return false;
  }
});

const noRepeatedDay = (days: string[]) => new Set(days).size === days.length;

const DESCRIPTION = z.string().trim();
const START_DATES = z.array(istDay).refine(noRepeatedDay);
const START_LOCATION = z.strictObject({
  coordinates: lngLat,
  address: TOUR_TEXT,
  description: TOUR_TEXT,
});
const LOCATIONS = z.array(
  z.strictObject({
    coordinates: lngLat,
    description: TOUR_TEXT,
    day: POSITIVE_WHOLE,
  }),
);
const GUIDES = z.array(z.string().regex(OBJECT_ID_HEX));

/**
 * The body of PATCH /api/v1/tours/[id] (B4, S4, QA-04). Every editable field is
 * optional, but an empty body is refused: a PATCH must change something.
 */
export const tourUpdateSchema = z
  .strictObject({
    name: TOUR_NAME.optional(),
    duration: POSITIVE_WHOLE.optional(),
    maxGroupSize: POSITIVE_WHOLE.optional(),
    difficulty: z.enum(DIFFICULTIES).optional(),
    price: POSITIVE_WHOLE.optional(),
    summary: TOUR_TEXT.optional(),
    description: DESCRIPTION.optional(),
    startDates: START_DATES.optional(),
    startLocation: START_LOCATION.optional(),
    locations: LOCATIONS.optional(),
    guides: GUIDES.optional(),
  })
  // Runs only on a body that parsed cleanly, so an unknown key is reported by its own path alone.
  .refine((input) => Object.keys(input).length > 0, {
    when: (payload) => payload.issues.length === 0,
  });

export type TourUpdateInput = z.infer<typeof tourUpdateSchema>;

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
