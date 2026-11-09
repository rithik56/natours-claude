import type { FakeCache } from '@/server/adapters/cache';
import type { FakeMailer } from '@/server/adapters/mailer';
import type { FakeEmailQueue } from '@/server/adapters/queue';
import type { FakeRateLimiter } from '@/server/adapters/rate-limit';
import type { FakeStorage } from '@/server/adapters/storage';
import type { FakeStripe } from '@/server/adapters/stripe';
import { getDeps } from '@/server/deps';

// Under APP_ENV development, test and ci every adapter is a fake that can be inspected.
function asFake<T extends { reset(): void }>(
  adapter: unknown,
  name: string,
): T {
  if (typeof adapter === 'object' && adapter !== null && 'reset' in adapter) {
    return adapter as T;
  }
  throw new Error(
    `The ${name} adapter is not a fake, so tests cannot inspect it`,
  );
}

/** What the app sent to the outside world during this test (plan.md 4.5). */
export const fakes = {
  get mailer(): FakeMailer {
    return asFake<FakeMailer>(getDeps().mailer, 'mailer');
  },
  get emailQueue(): FakeEmailQueue {
    return asFake<FakeEmailQueue>(getDeps().emailQueue, 'email queue');
  },
  get storage(): FakeStorage {
    return asFake<FakeStorage>(getDeps().storage, 'storage');
  },
  get stripe(): FakeStripe {
    return asFake<FakeStripe>(getDeps().stripe, 'Stripe');
  },
  get rateLimit(): FakeRateLimiter {
    return asFake<FakeRateLimiter>(getDeps().rateLimiter, 'rate limiter');
  },
  get cache(): FakeCache {
    return asFake<FakeCache>(getDeps().cache, 'cache');
  },
};

/** Empties every fake. test/setup.ts runs it before each test. */
export function resetFakes(): void {
  fakes.mailer.reset();
  fakes.emailQueue.reset();
  fakes.storage.reset();
  fakes.stripe.reset();
  fakes.rateLimit.reset();
  fakes.cache.reset();
}
