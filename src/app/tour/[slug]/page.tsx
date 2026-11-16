import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cache, Suspense } from 'react';
import { BookingSection } from '@/components/features/booking-section';
import {
  GuidesFallback,
  GuidesSection,
} from '@/components/features/guides-section';
import {
  TourGallery,
  type GalleryPhoto,
} from '@/components/features/tour-gallery';
import { TourRoute } from '@/components/features/tour-route';
import {
  ReviewsFallback,
  ReviewsSection,
} from '@/components/features/reviews-section';
import { FactsStrip } from '@/components/ui/facts-strip';
import { Link } from '@/components/ui/link';
import { PhotoCredits } from '@/components/ui/photo-credits';
import { Skeleton } from '@/components/ui/skeleton';
import { parseQuery } from '@/server/api/parse-query';
import { formatPrice } from '@/lib/format';
import { getConfig } from '@/server/config';
import { getDeps } from '@/server/deps';
import { reviewPageQuerySchema } from '@/server/modules/reviews/schemas';
import type { TourDetail } from '@/server/modules/tours/dto';
import { getBySlug } from '@/server/modules/tours/service';
import styles from './page.module.css';

type TourPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// One lookup per request: generateMetadata and the page share it through React's cache() (R3).
// A missing slug calls notFound() before anything renders, so it is a real 404 (R4, ADR 0032).
const getTourPage = cache(getBySlug);

/** The credit of the cover photo: the one whose file is the tour's imageCover. */
function coverCredit(tour: TourDetail) {
  return tour.photoCredits.find((credit) => credit.file === tour.imageCover);
}

/**
 * One credit row per photo, the cover first and then the gallery in its order (U27). Rows
 * keep their place even when two photos share an author and licence.
 */
function creditRows(tour: TourDetail) {
  return [tour.imageCover, ...tour.images].flatMap((file) => {
    const credit = tour.photoCredits.find((entry) => entry.file === file);
    return credit
      ? [
          {
            authorName: credit.author,
            licenceName: credit.license,
            licenceUrl: credit.licenseUrl,
          },
        ]
      : [];
  });
}

/**
 * The extra photos in the order of the tour's `images` array, each with its credit (D-09, U7).
 * A photo with no credit is left out, because it could not be captioned (U27).
 */
function galleryPhotos(tour: TourDetail): GalleryPhoto[] {
  const photos: GalleryPhoto[] = [];
  for (const file of tour.images) {
    const credit = tour.photoCredits.find((entry) => entry.file === file);
    if (!credit) continue;
    photos.push({
      url: getDeps().storage.urlFor(file),
      alt: credit.alt,
      author: credit.author,
      licence: credit.license,
      licenceUrl: credit.licenseUrl,
    });
  }
  return photos;
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
}: Pick<TourPageProps, 'params'>): Promise<Metadata> {
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

export default async function TourPage({
  params,
  searchParams,
}: TourPageProps) {
  const { slug } = await params;
  const tour = await getTourPage(slug);
  if (!tour) notFound();
  // Lenient (D-08, T-04-22): a bad reviewPage falls back to the first page, and the reviews clamp it.
  const { reviewPage } = parseQuery(reviewPageQuerySchema, await searchParams);

  const cover = coverCredit(tour);
  const photos = galleryPhotos(tour);
  const credits = creditRows(tour);
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
      {/* The booking panel depends on the visitor, so it streams behind a same-sized skeleton (R4, R5). */}
      <div className={styles.aside}>
        <Suspense fallback={<Skeleton variant="booking-panel" />}>
          <BookingSection tour={tour} />
        </Suspense>
      </div>
      <div className={styles.content}>
        {tour.locations.length > 0 ? (
          <section className={styles.section}>
            <h2>Itinerary</h2>
            <TourRoute locations={tour.locations} />
          </section>
        ) : null}
        {paragraphs.length > 0 ? (
          <section className={styles.description}>
            <h2>About this tour</h2>
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ) : null}
        {photos.length > 0 ? (
          <section className={styles.section}>
            <h2>Photos</h2>
            <TourGallery photos={photos} />
          </section>
        ) : null}
        {/* The headings stay outside their boundaries, so the page keeps its order while the lists stream (R4). */}
        <section className={styles.section}>
          <h2>Your guides</h2>
          <Suspense fallback={<GuidesFallback />}>
            <GuidesSection tour={tour} />
          </Suspense>
        </section>
        <section id="reviews" className={styles.reviews}>
          <h2>Reviews</h2>
          <Suspense fallback={<ReviewsFallback />}>
            <ReviewsSection tour={tour} page={reviewPage} />
          </Suspense>
        </section>
        {credits.length > 0 ? (
          <section className={styles.section}>
            <h2>Photo credits</h2>
            <PhotoCredits credits={credits} />
            <Link href="/credits">Read the photo credits</Link>
          </section>
        ) : null}
      </div>
    </article>
  );
}
