import type { MetadataRoute } from 'next';
import { getConfig } from '@/server/config';

// ARC-07: rendered per request, so the origin is read when a crawler asks, never at build time.
export const dynamic = 'force-dynamic';

/**
 * robots.txt (R10): the account pages and the styleguide are kept out of search, and the
 * sitemap is named on APP_URL, never on the request's host (SEC-12).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: ['/me', '/my-tours', '/styleguide'],
    },
    sitemap: `${getConfig().appOrigin}/sitemap.xml`,
  };
}
