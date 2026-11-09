import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeRateLimiter } from '@/server/adapters/rate-limit';

const login = { name: 'login', points: 10, durationSeconds: 900 };
const START = new Date('2026-11-09T09:00:00+05:30');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fake rate limiter', () => {
  it('[S15] allows ten attempts and counts down the remaining points', async () => {
    const limiter = createFakeRateLimiter();
    const results = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      results.push(await limiter.consume('203.0.113.7:anjali', login));
    }
    expect(results.every((result) => result.allowed)).toBe(true);
    expect(results.map((result) => result.remaining)).toEqual([
      9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
    ]);
  });

  it('[S15] refuses the eleventh attempt and says how long to wait', async () => {
    const limiter = createFakeRateLimiter();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await limiter.consume('203.0.113.7:anjali', login);
    }
    const eleventh = await limiter.consume('203.0.113.7:anjali', login);
    expect(eleventh.allowed).toBe(false);
    expect(eleventh.remaining).toBe(0);
    expect(eleventh.retryAfterSeconds).toBe(900);
  });

  it('[S15] counts down retryAfterSeconds as the window passes', async () => {
    const limiter = createFakeRateLimiter();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await limiter.consume('203.0.113.7:anjali', login);
    }
    vi.setSystemTime(new Date(START.getTime() + 100_000));
    const refused = await limiter.consume('203.0.113.7:anjali', login);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBe(800);
  });

  it('[S15] leaves a different key unaffected', async () => {
    const limiter = createFakeRateLimiter();
    for (let attempt = 0; attempt < 11; attempt += 1) {
      await limiter.consume('203.0.113.7:anjali', login);
    }
    const other = await limiter.consume('198.51.100.4:nikhil', login);
    expect(other.allowed).toBe(true);
  });

  it('[S15] keeps a separate count for each rule name', async () => {
    const limiter = createFakeRateLimiter();
    const signup = { name: 'signup', points: 2, durationSeconds: 3600 };
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await limiter.consume('203.0.113.7', login);
    }
    const first = await limiter.consume('203.0.113.7', signup);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
  });

  it('[S15] allows attempts again once the window has passed', async () => {
    const limiter = createFakeRateLimiter();
    for (let attempt = 0; attempt < 11; attempt += 1) {
      await limiter.consume('203.0.113.7:anjali', login);
    }
    vi.setSystemTime(new Date(START.getTime() + 901_000));
    const again = await limiter.consume('203.0.113.7:anjali', login);
    expect(again.allowed).toBe(true);
    expect(again.remaining).toBe(9);
  });

  it('[Q7] reset clears every counter', async () => {
    const limiter = createFakeRateLimiter();
    for (let attempt = 0; attempt < 11; attempt += 1) {
      await limiter.consume('203.0.113.7:anjali', login);
    }
    limiter.reset();
    const fresh = await limiter.consume('203.0.113.7:anjali', login);
    expect(fresh.allowed).toBe(true);
    expect(fresh.remaining).toBe(9);
  });
});
