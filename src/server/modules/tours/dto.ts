import 'server-only';
import type { Types } from 'mongoose';
import { toIstDay, type IstDay } from '@/lib/ist';
import type { TourFields } from './model';

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
  | 'createdAt'
> & {
  _id: { toString(): string };
  startLocation: Pick<
    TourFields['startLocation'],
    'coordinates' | 'address' | 'description'
  >;
};

/** A guide reference: an id, as stored. Populated guides are not read here (B12). */
type GuideRef = Types.ObjectId | { _id: Types.ObjectId };

type DetailSource = SummarySource &
  Pick<TourFields, 'description' | 'images' | 'photoCredits'> & {
    locations: Array<
      Pick<
        TourFields['locations'][number],
        'day' | 'description' | 'coordinates'
      >
    >;
    guides: GuideRef[];
  };

/**
 * A tour as the catalogue and cards show it (S3, R6). `imageCover` is null for a tour
 * with no cover yet (D-13). The public reads never return such a tour, so a card always
 * has its photo; `hasCover` narrows the type where a cover is needed.
 */
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
  imageCover: string | null;
  startDates: IstDay[];
  /** An ISO instant. The API sorts by it when no sort is given (B1). */
  createdAt: string;
  startLocation: {
    coordinates: number[];
    address: string;
    description: string;
  };
};

/** A photo credit as a page shows it: `alt` is always text (D-15). */
type TourPhotoCredit = Omit<TourFields['photoCredits'][number], 'alt'> & {
  alt: string;
};

/**
 * A tour as its detail page and API show it. The guides are not in here: they
 * are read on their own, so the tour document itself needs no populate (plan 04-06, RESEARCH
 * Pattern 6). `guideIds` keeps the tour's guides order for that later read.
 */
export type TourDetail = TourSummary & {
  description: string | null;
  images: string[];
  locations: Array<{ day: number; description: string; coordinates: number[] }>;
  guideIds: string[];
  photoCredits: TourPhotoCredit[];
};

/** One photo's credit on `/credits` (U27). The key is the storage key the photo is served from. */
type CreditPhoto = {
  key: string;
  title: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
};

/** One tour's block on `/credits`: its credited photos, the cover first (U27). */
export type CreditGroup = {
  name: string;
  slug: string;
  photos: CreditPhoto[];
};

type CreditSource = Pick<
  TourFields,
  'name' | 'slug' | 'imageCover' | 'images' | 'photoCredits'
>;

/**
 * Maps one tour to its credits: the cover first, then the gallery in `images`
 * order (U27). A photo with no credit is left out, because it could not be
 * captioned. A tour with no credited photo gives null, so the page renders no
 * empty group.
 */
export function toCreditGroup(tour: CreditSource): CreditGroup | null {
  const photos = [tour.imageCover, ...tour.images].flatMap((key) => {
    if (key === undefined) return [];
    const credit = tour.photoCredits.find((entry) => entry.file === key);
    if (!credit) return [];
    return [
      {
        key,
        title: credit.title,
        sourceUrl: credit.sourceUrl,
        author: credit.author,
        license: credit.license,
        licenseUrl: credit.licenseUrl,
      },
    ];
  });
  return photos.length > 0
    ? { name: tour.name, slug: tour.slug, photos }
    : null;
}

const IMAGE_EXTENSION = /\.(jpe?g|png|webp)$/i;

/**
 * The alt text a credit shows when no alt is stored (D-15). The cover uses the
 * tour name; any other photo uses its title, without the file extension, with
 * underscores as spaces.
 */
function fallbackAlt(
  credit: TourFields['photoCredits'][number],
  tour: Pick<SummarySource, 'name' | 'imageCover'>,
): string {
  if (credit.file === tour.imageCover) return tour.name;
  return credit.title.replace(IMAGE_EXTENSION, '').replace(/_/g, ' ').trim();
}

function altFor(
  credit: TourFields['photoCredits'][number],
  tour: Pick<SummarySource, 'name' | 'imageCover'>,
): string {
  if (typeof credit.alt === 'string' && credit.alt.trim().length > 0) {
    return credit.alt;
  }
  return fallbackAlt(credit, tour);
}

/**
 * Whether a tour has a cover (D-13). The public reads keep only covered tours, so a card
 * or a page that needs its photo narrows with this guard instead of trusting the type.
 *
 * @param entry - A summary, a detail or a stored record; only `imageCover` is read.
 * @returns True when `imageCover` is a non-empty storage key.
 */
export function hasCover<T extends { imageCover?: string | null }>(
  entry: T,
): entry is T & { imageCover: string } {
  return typeof entry.imageCover === 'string' && entry.imageCover.length > 0;
}

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
    imageCover: tour.imageCover ?? null,
    startDates: tour.startDates.map(toIstDay),
    createdAt: tour.createdAt.toISOString(),
    startLocation: {
      coordinates: [...tour.startLocation.coordinates],
      address: tour.startLocation.address,
      description: tour.startLocation.description,
    },
  };
}

/** The id of one stored guide reference, in the tour's own order. */
function guideIdOf(guide: GuideRef): string {
  return String('_id' in guide ? guide._id : guide);
}

/**
 * Maps a tour for its detail page. The tour is read without a populate, so its
 * guides are ids: `guideIds` keeps their order, and `getGuides` reads the people.
 */
export function toTourDetail(tour: DetailSource): TourDetail {
  return {
    ...toTourSummary(tour),
    description: tour.description ?? null,
    images: [...tour.images],
    locations: tour.locations.map((stop) => ({
      day: stop.day,
      description: stop.description,
      coordinates: [...stop.coordinates],
    })),
    guideIds: tour.guides.map(guideIdOf),
    photoCredits: tour.photoCredits.map((credit) => ({
      file: credit.file,
      title: credit.title,
      author: credit.author,
      license: credit.license,
      licenseUrl: credit.licenseUrl,
      sourceUrl: credit.sourceUrl,
      alt: altFor(credit, tour),
    })),
  };
}
