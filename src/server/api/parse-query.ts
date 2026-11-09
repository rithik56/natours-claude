import 'server-only';
import { AppError } from '@/server/errors';
import { issuesToDetails, type z } from '@/server/validation';

type SearchParamsInput =
  URLSearchParams | Record<string, string | string[] | undefined>;

// A Map, so a key such as __proto__ is only ever data.
function normalise(input: SearchParamsInput): Map<string, string | string[]> {
  const values = new Map<string, string | string[]>();
  if (input instanceof URLSearchParams) {
    for (const key of new Set(input.keys())) {
      const all = input.getAll(key);
      values.set(key, all.length === 1 ? (all[0] ?? '') : all);
    }
    return values;
  }
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) values.set(key, value);
  }
  return values;
}

/**
 * Reads a page's query string leniently (plan.md 4.3): a field that fails its
 * schema falls back to its default, or is left out when optional, and unknown
 * keys are dropped. Route Handlers validate strictly through `withApi` instead.
 *
 * @param schema - A Zod object, with defaults for the fields that may be bad.
 * @param searchParams - `URLSearchParams` or the `searchParams` record of a page.
 * @returns The parsed query.
 * @throws AppError VALIDATION_ERROR when a field with no default is required and invalid.
 */
export function parseQuery<S extends z.ZodObject>(
  schema: S,
  searchParams: SearchParamsInput,
): z.infer<S> {
  const raw = normalise(searchParams);
  const kept: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema.shape)) {
    const value = raw.get(key);
    if (value !== undefined && field.safeParse(value).success) {
      kept[key] = value;
    }
  }
  const result = schema.safeParse(kept);
  if (!result.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      undefined,
      issuesToDetails(result.error),
    );
  }
  return result.data;
}
