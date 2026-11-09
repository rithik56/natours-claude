import 'server-only';

export interface Cache {
  cached<A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    keyParts: string[],
    tags: string[],
  ): (...args: A) => Promise<R>;
  invalidate(...tags: string[]): Promise<void>;
}

export type FakeCache = Cache & { invalidated: string[]; reset(): void };

export function createFakeCache(): FakeCache {
  return {
    invalidated: [],
    cached: (fn) => fn,
    invalidate: async () => {},
    reset: () => {},
  };
}
