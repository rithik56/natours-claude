import 'server-only';
import type { z } from '@/server/validation';

// Throwaway RED stub: returns nothing parsed.
export function parseQuery<S extends z.ZodObject>(
  schema: S,
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): z.infer<S> {
  void schema;
  void searchParams;
  return {} as z.infer<S>;
}
