import type { MetadataRoute } from 'next';

export const dynamic = 'auto';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*' } };
}
