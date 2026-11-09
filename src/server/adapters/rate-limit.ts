import 'server-only';
import { now } from '@/server/clock';

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

/** Counts attempts per key and rule. Phase 5 adds the Redis-backed limiter (S15). */
export interface RateLimiter {
  consume(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

export type FakeRateLimiter = RateLimiter & { reset(): void };

type Window = { startedAt: number; used: number };

/** A fixed window per rule and key, timed by the one clock so tests can pin or move it. */
export function createFakeRateLimiter(): FakeRateLimiter {
  const windows = new Map<string, Window>();
  return {
    async consume(key, rule) {
      const id = `${rule.name}:${key}`;
      const current = now().getTime();
      const lengthMs = rule.durationSeconds * 1000;
      let window = windows.get(id);
      if (!window || current - window.startedAt >= lengthMs) {
        window = { startedAt: current, used: 0 };
        windows.set(id, window);
      }
      if (window.used >= rule.points) {
        const waitMs = window.startedAt + lengthMs - current;
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.ceil(waitMs / 1000),
        };
      }
      window.used += 1;
      return {
        allowed: true,
        remaining: rule.points - window.used,
        retryAfterSeconds: 0,
      };
    },
    reset() {
      windows.clear();
    },
  };
}
