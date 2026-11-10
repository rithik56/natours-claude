import 'server-only';
import { toIstDay, type IstDay } from '@/lib/ist';
import { toPublicUser, type PublicUser } from '@/server/modules/users/dto';
import type { TourFields } from './model';

type GuideSource = Parameters<typeof toPublicUser>[0];

type SummarySource = Pick<
  TourFields,
  | 'name'
  | 'slug'
  | 'duration'
  | 'maxGroupSize'
  | 'difficulty'
  | 'price'
  | 'ratingsAverage'
  | 'ratingsQuantity'
  | 'summary'
  | 'imageCover'
  | 'startDates'
> & {
  _id: { toString(): string };
  startLocation: Pick<
    TourFields['startLocation'],
    'coordinates' | 'address' | 'description'
  >;
};

type DetailSource = SummarySource &
  Pick<TourFields, 'description' | 'images' | 'photoCredits'> & {
    locations: Array<
      Pick<
        TourFields['locations'][number],
        'day' | 'description' | 'coordinates'
      >
    >;
    guides: Array<GuideSource | { toString(): string }>;
  };

/** A tour as the catalogue and cards show it (S3, R6). */
export type TourSummary = {
  id: string;
  name: string;
  slug: string;
  duration: number;
  maxGroupSize: number;
  difficulty: TourFields['difficulty'];
  price: number;
  ratingsAverage: number;
  ratingsQuantity: number;
  summary: string;
  imageCover: string;
  startDates: IstDay[];
  startLocation: {
    coordinates: number[];
    address: string;
    description: string;
  };
};

/** A tour as its detail page shows it. */
export type TourDetail = TourSummary & {
  description: string | null;
  images: string[];
  locations: Array<{ day: number; description: string; coordinates: number[] }>;
  guides: PublicUser[];
  photoCredits: TourFields['photoCredits'];
};

/** Maps a tour for lists and cards. Every array keeps the document's order (R6). */
export function toTourSummary(tour: SummarySource): TourSummary {
  return {
    id: tour._id.toString(),
    name: tour.name,
    slug: tour.slug,
    duration: tour.duration,
    maxGroupSize: tour.maxGroupSize,
    difficulty: tour.difficulty,
    price: tour.price,
    ratingsAverage: tour.ratingsAverage,
    ratingsQuantity: tour.ratingsQuantity,
    summary: tour.summary,
    imageCover: tour.imageCover,
    startDates: tour.startDates.map(toIstDay),
    startLocation: {
      coordinates: [...tour.startLocation.coordinates],
      address: tour.startLocation.address,
      description: tour.startLocation.description,
    },
  };
}

// Mongoose populates a missing reference (a deleted guide) as null when nulls
// are retained, and typeof null is 'object', so the null check must come
// before the `in` checks. How a tour with a missing guide is shown is a
// Phase 4 service decision; until then it fails with the "not populated" error.
function isGuideRecord(
  guide: GuideSource | { toString(): string } | null,
): guide is GuideSource {
  return (
    typeof guide === 'object' &&
    guide !== null &&
    'name' in guide &&
    'role' in guide
  );
}

/**
 * Maps a tour for its detail page. The guides must be populated: an id in
 * their place is a programming error, so it throws.
 */
export function toTourDetail(tour: DetailSource): TourDetail {
  const guides = tour.guides.map((guide) => {
    if (!isGuideRecord(guide)) {
      throw new Error('toTourDetail needs the tour guides to be populated');
    }
    return toPublicUser(guide);
  });
  return {
    ...toTourSummary(tour),
    description: tour.description ?? null,
    images: [...tour.images],
    locations: tour.locations.map((stop) => ({
      day: stop.day,
      description: stop.description,
      coordinates: [...stop.coordinates],
    })),
    guides,
    photoCredits: tour.photoCredits.map((credit) => ({
      file: credit.file,
      title: credit.title,
      author: credit.author,
      license: credit.license,
      licenseUrl: credit.licenseUrl,
      sourceUrl: credit.sourceUrl,
    })),
  };
}
