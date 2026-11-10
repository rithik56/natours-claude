import 'server-only';
import { createFakeCache, type Cache } from '@/server/adapters/cache';
import { createFakeMailer, type Mailer } from '@/server/adapters/mailer';
import { createFakeEmailQueue, type EmailQueue } from '@/server/adapters/queue';
import {
  createFakeRateLimiter,
  type RateLimiter,
} from '@/server/adapters/rate-limit';
import { createNextCache } from '@/server/adapters/real-cache';
import { createFakeStorage, type Storage } from '@/server/adapters/storage';
import { createFakeStripe, type StripeClient } from '@/server/adapters/stripe';
import { getConfig } from '@/server/config';

export type Deps = {
  mailer: Mailer;
  emailQueue: EmailQueue;
  storage: Storage;
  stripe: StripeClient;
  rateLimiter: RateLimiter;
  cache: Cache;
};

/** Chosen by APP_ENV, never NODE_ENV (QA-21). See ADR 0016. */
let deps: Deps | undefined;

function noRealAdapter(name: string, phase: string): never {
  throw new Error(
    `No real ${name} adapter is configured yet (ADR 0016); ${phase} adds it`,
  );
}

// Staging and production never fall back to a fake: using one that has no real adapter yet throws.
function productionLikeDeps(): Deps {
  return {
    get mailer(): Mailer {
      return noRealAdapter('mailer', 'Phase 5');
    },
    get emailQueue(): EmailQueue {
      return noRealAdapter('queue', 'Phase 5');
    },
    get rateLimiter(): RateLimiter {
      return noRealAdapter('rate-limit', 'Phase 5');
    },
    get stripe(): StripeClient {
      return noRealAdapter('Stripe', 'Phase 6');
    },
    get storage(): Storage {
      return noRealAdapter('storage', 'Phase 4 or 8');
    },
    cache: createNextCache(),
  };
}

function fakeDeps(appEnv: string): Deps {
  return {
    mailer: createFakeMailer(),
    emailQueue: createFakeEmailQueue(),
    storage: createFakeStorage(),
    stripe: createFakeStripe(),
    rateLimiter: createFakeRateLimiter(),
    cache: appEnv === 'test' ? createFakeCache() : createNextCache(),
  };
}

/** The outside-world adapters for this process, built once on first use. */
export function getDeps(): Deps {
  if (!deps) {
    const config = getConfig();
    deps = config.isProductionLike
      ? productionLikeDeps()
      : fakeDeps(config.APP_ENV);
  }
  return deps;
}
