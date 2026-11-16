import type { MetadataRoute } from 'next';
import { getConfig } from '@/server/config';
import { listSlugs } from '@/server/modules/tours/service';

// ARC-07, RESEARCH Pitfall 6: rendered per request, so `next build` never runs it without a
// database or an environment. Without this the build prerenders /sitemap.xml and fails.
export const dynamic = 'force-dynamic';

/**
 * The sitemap (R10): `/`, `/credits`, then every catalogue tour in name order. Every URL is
 * built from APP_URL, never from the request (SEC-12). No `lastModified`: the catalogue
 * records none that would be true for the page.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { appOrigin } = getConfig();
  const slugs = await listSlugs();
  return [
    { url: `${appOrigin}/` },
    { url: `${appOrigin}/credits` },
    ...slugs.map((slug) => ({ url: `${appOrigin}/tour/${slug}` })),
  ];
}
