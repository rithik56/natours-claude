import { describe, expect, it } from 'vitest';
import { generateMetadata } from '@/app/tour/[slug]/page';
import { formatPrice } from '@/lib/format';
import { getConfig } from '@/server/config';
import { useTestDatabase } from '../helpers/db';
import { createTour } from '../helpers/factories';
import { seedTours } from '../helpers/seed';

const SLUG = 'valley-of-flowers-trek';

function metadataFor(slug: string) {
  return generateMetadata({ params: Promise.resolve({ slug }) });
}

function digestOf(error: unknown): string {
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' ? digest : 'no digest';
}

describe('tour page metadata (R10, U7, SEC-12)', () => {
  useTestDatabase();

  it('[R10] gives the tour name as the title and "{summary} {n} days, {price} per person." as the description', async () => {
    const record = seedTours().find((tour) => tour.slug === SLUG)!;
    await createTour({ slug: SLUG });

    const metadata = await metadataFor(SLUG);

    const days = record.duration === 1 ? '1 day' : `${record.duration} days`;
    expect(metadata.title).toBe(record.name);
    expect(metadata.description).toBe(
      `${record.summary} ${days}, ${formatPrice(record.price)} per person.`,
    );
    expect(metadata.description).toContain('₹');
  });

  it('[SEC-12] builds the canonical URL from APP_URL, never from the request', async () => {
    await createTour({ slug: SLUG });

    const metadata = await metadataFor(SLUG);

    expect(metadata.alternates?.canonical).toBe(
      `${getConfig().appOrigin}/tour/${SLUG}`,
    );
  });

  it('[U7] gives the cover photo as og:image, on APP_URL, with its alt text and the cover key', async () => {
    await createTour({ slug: SLUG });

    const metadata = await metadataFor(SLUG);
    const images = metadata.openGraph?.images as Array<{
      url: string;
      alt: string;
    }>;

    expect(images).toHaveLength(1);
    expect(images[0]!.url.startsWith(getConfig().appOrigin)).toBe(true);
    expect(images[0]!.url).toMatch(
      /\/media\/tours\/valley-of-flowers-trek-cover\.jpg$/,
    );
    expect(images[0]!.alt.trim().length).toBeGreaterThan(0);
  });

  it('[R10] carries the locale, the site type and the large social card', async () => {
    await createTour({ slug: SLUG });

    const metadata = await metadataFor(SLUG);

    expect(metadata.openGraph).toMatchObject({
      locale: 'en_IN',
      siteName: 'Natours',
      type: 'website',
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('[R4] a missing slug throws the not-found digest, so the page answers 404', async () => {
    await createTour({ slug: SLUG });

    const error = await metadataFor('does-not-exist').catch(
      (caught: unknown) => caught,
    );

    expect(digestOf(error)).toMatch(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });
});
