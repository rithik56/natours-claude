import 'server-only';

/** Options a cached read may set. `revalidate` is seconds; absent means Next's default (ADR 0031). */
type CacheOptions = { revalidate?: number };

/**
 * The tagged data cache (ADR 0012). Services call `cached` and `invalidate`
 * and never import Next's cache functions themselves.
 */
export interface Cache {
  cached<A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    keyParts: string[],
    tags: string[],
    options?: CacheOptions,
  ): (...args: A) => Promise<R>;
  invalidate(...tags: string[]): Promise<void>;
}

export type FakeCache = Cache & { invalidated: string[]; reset(): void };

/** Calls the function every time, and records invalidated tags for tests to inspect. */
export function createFakeCache(): FakeCache {
  const invalidated: string[] = [];
  return {
    invalidated,
    cached: (fn) => fn,
    async invalidate(...tags) {
      invalidated.push(...tags);
    },
    reset() {
      invalidated.length = 0;
    },
  };
}
