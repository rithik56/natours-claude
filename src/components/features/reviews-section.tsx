import { Pagination } from '@/components/ui/pagination';
import { ReviewItem } from '@/components/ui/review-item';
import { Skeleton } from '@/components/ui/skeleton';
import { getDeps } from '@/server/deps';
import type { ReviewDto } from '@/server/modules/reviews/dto';
import { listForTour } from '@/server/modules/reviews/service';
import type { TourDetail } from '@/server/modules/tours/dto';
import styles from './reviews-section.module.css';

/** One review as the list shows it: plain values, with the photo already a URL (S3). */
export type ReviewListItem = {
  id: string;
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  comment: string;
  /** An ISO timestamp. */
  createdAt: string;
};

type ReviewListProps = {
  items: ReviewListItem[];
  page: number;
  totalPages: number;
  slug: string;
};

/**
 * One page of a tour's reviews, newest first (D-08). With no reviews it says so in a plain muted
 * line, with no list and no pagination. The pagination appears only when there is a second page;
 * its links use `reviewPage` and return to the Reviews heading with `#reviews`, and they work with
 * JavaScript off because they are plain links (U11, UI-SPEC Open item 9).
 */
export function ReviewList({ items, page, totalPages, slug }: ReviewListProps) {
  if (items.length === 0) {
    return <p className={styles.empty}>No reviews yet.</p>;
  }
  const pageHref = (target: number) =>
    `/tour/${slug}?reviewPage=${target}#reviews`;

  return (
    <>
      <ul className={styles.list}>
        {items.map((item) => (
          <ReviewItem
            key={item.id}
            authorName={item.authorName}
            authorPhotoUrl={item.authorPhotoUrl}
            rating={item.rating}
            comment={item.comment}
            createdAt={item.createdAt}
          />
        ))}
      </ul>
      {totalPages > 1 ? (
        <div className={styles.paging}>
          <Pagination
            page={page}
            totalPages={totalPages}
            label="Review pagination"
            previousHref={pageHref(page - 1)}
            nextHref={pageHref(page + 1)}
          />
        </div>
      ) : null}
    </>
  );
}

/**
 * The placeholder for the reviews while they stream: four review-item skeletons, which is what
 * every seed tour has, in the same list as the real reviews (R4).
 */
export function ReviewsFallback() {
  return (
    <ul className={styles.list}>
      {[0, 1, 2, 3].map((index) => (
        <li key={index}>
          <Skeleton variant="review-item" />
        </li>
      ))}
    </ul>
  );
}

function toListItem(review: ReviewDto): ReviewListItem {
  return {
    id: review.id,
    authorName: review.author.name,
    authorPhotoUrl: review.author.photo
      ? getDeps().storage.urlFor(review.author.photo)
      : undefined,
    rating: review.rating,
    comment: review.review,
    createdAt: review.createdAt,
  };
}

type ReviewsSectionProps = {
  tour: Pick<TourDetail, 'id' | 'slug'>;
  /** The page asked for, at least 1; the service clamps it to the last page (D-08). */
  page: number;
};

/**
 * The reviews of one tour, one page at a time (D-08). It reads only its own data, so it streams in
 * beside the booking panel and the guides.
 */
export async function ReviewsSection({ tour, page }: ReviewsSectionProps) {
  const result = await listForTour(tour.id, page);
  return (
    <ReviewList
      items={result.items.map(toListItem)}
      page={result.page}
      totalPages={result.totalPages}
      slug={tour.slug}
    />
  );
}
