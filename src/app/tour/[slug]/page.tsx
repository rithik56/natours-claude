import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { FactsStrip } from '@/components/ui/facts-strip';
import { Link } from '@/components/ui/link';
import { formatPrice } from '@/lib/format';
import { getConfig } from '@/server/config';
import { getDeps } from '@/server/deps';
import type { TourDetail } from '@/server/modules/tours/dto';
import { getBySlug } from '@/server/modules/tours/service';
import styles from './page.module.css';

type TourPageProps = { params: Promise<{ slug: string }> };

// One lookup per request: generateMetadata and the page share it through React's cache() (R3).
// A missing slug calls notFound() before anything renders, so it is a real 404 (R4, ADR 0032).
const getTourPage = cache(getBySlug);

/** The credit of the cover photo: the one whose file is the tour's imageCover. */
function coverCredit(tour: TourDetail) {
  return tour.photoCredits.find((credit) => credit.file === tour.imageCover);
}

/** "6 days" or "1 day", as the description reads (copy: "{summary} {n} days, {price} per person."). */
function dayCount(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

/**
 * Title, description, canonical URL and social preview for one tour (U7, R10, SEC-12).
 * Every absolute URL comes from APP_URL, never from request headers.
 */
export async function generateMetadata({
  params,
}: TourPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourPage(slug);
  if (!tour) notFound();

  const { appOrigin } = getConfig();
  const pageUrl = `${appOrigin}/tour/${tour.slug}`;
  const description = `${tour.summary} ${dayCount(tour.duration)}, ${formatPrice(tour.price)} per person.`;
  const image = {
    url: new URL(
      getDeps().storage.urlFor(tour.imageCover),
      appOrigin,
    ).toString(),
    alt: coverCredit(tour)?.alt ?? tour.name,
  };

  return {
    title: tour.name,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      siteName: 'Natours',
      locale: 'en_IN',
      url: pageUrl,
      title: tour.name,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: tour.name,
      description,
      images: [image.url],
    },
  };
}

export default async function TourPage({ params }: TourPageProps) {
  const { slug } = await params;
  const tour = await getTourPage(slug);
  if (!tour) notFound();

  const cover = coverCredit(tour);
  const paragraphs = (tour.description ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <figure className={styles.cover}>
          <div className={styles.frame}>
            <Image
              src={getDeps().storage.urlFor(tour.imageCover)}
              alt={cover?.alt ?? tour.name}
              fill
              preload
              sizes="(min-width: 64em) 70rem, 100vw"
              className={styles.image}
            />
          </div>
          {cover ? (
            <figcaption className={styles.caption}>
              Photo: {cover.author},{' '}
              <Link href={cover.licenseUrl}>{cover.license}</Link>
            </figcaption>
          ) : null}
        </figure>
        <h1 className={styles.name}>{tour.name}</h1>
        <FactsStrip
          difficulty={tour.difficulty}
          lengthDays={tour.duration}
          groupSize={tour.maxGroupSize}
          location={tour.startLocation.address}
          rating={tour.ratingsAverage}
        />
      </header>
      {/* Reserved for the booking panel (plan 04-07): empty until then, so the aside column stays hidden. */}
      <div className={styles.aside} />
      <div className={styles.content}>
        {paragraphs.length > 0 ? (
          <section className={styles.description}>
            <h2>About this tour</h2>
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ) : null}
      </div>
    </article>
  );
}
