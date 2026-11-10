import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakes } from '../helpers/fakes';
import { getDeps } from '@/server/deps';

const login = { name: 'login', points: 10, durationSeconds: 900 };
const welcome = {
  template: 'Welcome',
  to: 'anjali.menon@example.com',
  firstName: 'Anjali',
  url: 'http://localhost:3000/tours',
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function depsFor(appEnv: string) {
  vi.stubEnv('APP_ENV', appEnv);
  vi.stubEnv('APP_URL', 'https://natours.example.com');
  vi.resetModules();
  return (await import('@/server/deps')).getDeps();
}

describe('getDeps under APP_ENV test', () => {
  it('[Q7] returns the same object on every call', () => {
    expect(getDeps() === getDeps()).toBe(true);
  });

  it('[Q7] hands out the instances the fakes accessors return', () => {
    const deps = getDeps();
    expect(deps.emailQueue === fakes.emailQueue).toBe(true);
    expect(deps.mailer === fakes.mailer).toBe(true);
    expect(deps.storage === fakes.storage).toBe(true);
    expect(deps.stripe === fakes.stripe).toBe(true);
    expect(deps.rateLimiter === fakes.rateLimit).toBe(true);
  });

  it('[Q7] uses the fake cache, which records invalidated tags', async () => {
    const deps = getDeps();
    expect(deps.cache === fakes.cache).toBe(true);
    await deps.cache.invalidate('tours');
    expect(fakes.cache.invalidated.join(',') === 'tours').toBe(true);
  });

  it('[Q7] a job enqueued in one test is gone in the next (part 1)', async () => {
    await getDeps().emailQueue.enqueue(welcome);
    expect(fakes.emailQueue.jobs).toHaveLength(1);
  });

  it('[Q7] a job enqueued in one test is gone in the next (part 2)', () => {
    expect(fakes.emailQueue.jobs).toHaveLength(0);
  });

  it('[Q7] a rate limit used up in one test does not carry into the next (part 1)', async () => {
    for (let attempt = 0; attempt < 11; attempt += 1) {
      await getDeps().rateLimiter.consume('203.0.113.7:anjali', login);
    }
    const refused = await getDeps().rateLimiter.consume(
      '203.0.113.7:anjali',
      login,
    );
    expect(refused.allowed).toBe(false);
  });

  it('[Q7] a rate limit used up in one test does not carry into the next (part 2)', async () => {
    const result = await getDeps().rateLimiter.consume(
      '203.0.113.7:anjali',
      login,
    );
    expect(result.allowed).toBe(true);
  });
});

describe('getDeps under APP_ENV development', () => {
  it('[Q7] uses fakes for Stripe and the other outside services', async () => {
    vi.stubEnv('APP_ENV', 'development');
    vi.resetModules();
    const deps = (await import('@/server/deps')).getDeps();
    const session = await deps.stripe.createCheckoutSession({
      amountPaise: 1899900,
      currency: 'inr',
      productName: 'Valley of Flowers Trek',
      imageUrls: [],
      customerEmail: 'anjali.menon@example.com',
      successUrl: 'http://localhost:3000/my-bookings',
      cancelUrl: 'http://localhost:3000/tours',
      metadata: {
        userId: '54d6406e367b4e8eb85a03ac',
        tourId: 'feca81d3ccf5abe9838809ad',
        startDate: '2026-07-18',
      },
    });
    expect(session.url.startsWith('https://checkout.stripe.com/')).toBe(true);
    await expect(
      deps.mailer.send({
        to: 'a@example.com',
        subject: 's',
        html: 'h',
        text: 't',
      }),
    ).resolves.toBeUndefined();
  });

  it('[Q7] uses the real tagged cache, not the fake', async () => {
    vi.stubEnv('APP_ENV', 'development');
    vi.resetModules();
    const deps = (await import('@/server/deps')).getDeps();
    expect('invalidated' in deps.cache).toBe(false);
  });
});

describe.each(['staging', 'production'])(
  'getDeps under APP_ENV %s',
  (appEnv) => {
    it.each([
      ['mailer', 'mailer', 'Phase 5'],
      ['emailQueue', 'queue', 'Phase 5'],
      ['rateLimiter', 'rate-limit', 'Phase 5'],
      ['stripe', 'Stripe', 'Phase 6'],
      ['storage', 'storage', 'Phase 4 or 8'],
    ] as const)(
      '[Q7] using %s throws an error naming the missing adapter',
      async (key, name, phase) => {
        const deps = await depsFor(appEnv);
        expect(() => deps[key]).toThrow(
          `No real ${name} adapter is configured yet (ADR 0016); ${phase} adds it`,
        );
      },
    );

    it('[Q7] never serves the fake cache', async () => {
      const deps = await depsFor(appEnv);
      expect('invalidated' in deps.cache).toBe(false);
    });
  },
);
