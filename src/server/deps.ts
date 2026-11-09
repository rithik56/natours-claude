import 'server-only';
import { createFakeCache, type Cache } from '@/server/adapters/cache';
import { createFakeMailer, type Mailer } from '@/server/adapters/mailer';
import { createFakeEmailQueue, type EmailQueue } from '@/server/adapters/queue';
import {
  createFakeRateLimiter,
  type RateLimiter,
} from '@/server/adapters/rate-limit';
import { createFakeStorage, type Storage } from '@/server/adapters/storage';
import { createFakeStripe, type StripeClient } from '@/server/adapters/stripe';

export type Deps = {
  mailer: Mailer;
  emailQueue: EmailQueue;
  storage: Storage;
  stripe: StripeClient;
  rateLimiter: RateLimiter;
  cache: Cache;
};

// Stub for the RED commit: always hands out fakes.
let deps: Deps | undefined;

export function getDeps(): Deps {
  deps ??= {
    mailer: createFakeMailer(),
    emailQueue: createFakeEmailQueue(),
    storage: createFakeStorage(),
    stripe: createFakeStripe(),
    rateLimiter: createFakeRateLimiter(),
    cache: createFakeCache(),
  };
  return deps;
}
