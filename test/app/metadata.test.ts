import { describe, expect, it } from 'vitest';
import { generateMetadata as creditsMetadata } from '@/app/credits/page';
import { generateMetadata as homeMetadata } from '@/app/page';
import robots, { dynamic as robotsDynamic } from '@/app/robots';
import sitemap, { dynamic as sitemapDynamic } from '@/app/sitemap';
import { getConfig } from '@/server/config';
import { useTestDatabase } from '../helpers/db';
import { createTour } from '../helpers/factories';
import { seedTours } from '../helpers/seed';

async function createWholeCatalogue(): Promise<void> {
  for (let index = 0; index < seedTours().length; index += 1) {
    await createTour();
  }
}

describe('sitemap, robots and page metadata (R10, SEC-12)', () => {
  useTestDatabase();

  it('[R10] the sitemap lists /, /credits, then the 13 tour pages in name order', async () => {
    await createWholeCatalogue();
    const origin = getConfig().appOrigin;
    const tourUrls = seedTours()
      .map((tour) => ({ name: tour.name, slug: tour.slug }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .map((tour) => `${origin}/tour/${tour.slug}`);

    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      `${origin}/`,
      `${origin}/credits`,
      ...tourUrls,
    ]);
    expect(entries).toHaveLength(15);
  });

  it('[R10] with no tours in the catalogue the sitemap lists exactly / and /credits', async () => {
    const origin = getConfig().appOrigin;

    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      `${origin}/`,
      `${origin}/credits`,
    ]);
  });

  it('[R10] the sitemap invents no lastModified', async () => {
    await createTour({ slug: 'ladakh-high-passes' });

    const entries = await sitemap();

    for (const entry of entries) {
      expect(entry).not.toHaveProperty('lastModified');
    }
  });

  it('[R10] robots disallows exactly /me, /my-tours and /styleguide and names the sitemap', () => {
    const result = robots();

    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ userAgent: '*' });
    expect(rules[0]!.disallow).toEqual(['/me', '/my-tours', '/styleguide']);
    expect(result.sitemap).toBe(`${getConfig().appOrigin}/sitemap.xml`);
  });

  it('[R10] the sitemap and robots are rendered per request, so the build needs no database or environment', () => {
    expect(sitemapDynamic).toBe('force-dynamic');
    expect(robotsDynamic).toBe('force-dynamic');
  });

  it('[R10] / has its title, description and the origin as its canonical URL', () => {
    const metadata = homeMetadata();

    expect(metadata.title).toBe('Small-group tours across India');
    expect(metadata.description).toBe(
      'Small-group tours across India, from the high passes of Ladakh to the backwaters of Kerala.',
    );
    expect(metadata.alternates?.canonical).toBe(`${getConfig().appOrigin}/`);
  });

  it('[R10] /credits has its title, description and canonical URL', () => {
    const metadata = creditsMetadata();

    expect(metadata.title).toBe('Photo credits');
    expect(metadata.description).toBe(
      'Author, licence and source for every photo on Natours.',
    );
    expect(metadata.alternates?.canonical).toBe(
      `${getConfig().appOrigin}/credits`,
    );
  });
});
