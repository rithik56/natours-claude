import 'server-only';

export type RateLimitRule = {
  name: string;
  points: number;
  durationSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export interface RateLimiter {
  consume(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

export type FakeRateLimiter = RateLimiter & { reset(): void };

export function createFakeRateLimiter(): FakeRateLimiter {
  return {
    consume: async (_key, rule) => ({
      allowed: true,
      remaining: rule.points,
      retryAfterSeconds: 0,
    }),
    reset: () => {},
  };
}
