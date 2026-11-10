import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import type { Cache } from './cache';

/**
 * The only file that imports next/cache (ADR 0012). It cannot run outside a
 * Next request, so coverage excludes it and the production build proves it compiles.
 */
export function createNextCache(): Cache {
  return {
    cached(fn, keyParts, tags) {
      return unstable_cache(fn, keyParts, { tags });
    },
    async invalidate(...tags) {
      for (const tag of tags) {
        // The one-argument form is deprecated; expire 0 is the documented form from handlers and webhooks.
        revalidateTag(tag, { expire: 0 });
      }
    },
  };
}
