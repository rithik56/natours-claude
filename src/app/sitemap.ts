import type { MetadataRoute } from 'next';

export const dynamic = 'auto';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [];
}
