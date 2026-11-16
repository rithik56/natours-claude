import 'server-only';
import { cache } from 'react';
import type { Types } from 'mongoose';
import { messages } from '@/lib/messages';
import { fromIstDay, istMonthBounds, toIstDay } from '@/lib/ist';
import { now } from '@/server/clock';
import { connectDb, isDbUnavailableError } from '@/server/db';
import { getDeps } from '@/server/deps';
import { AppError } from '@/server/errors';
import { normalize, randomImageKey } from '@/server/images';
import { getLogger } from '@/server/logger';
import { countForTour } from '@/server/modules/bookings/service';
import { deleteForTour } from '@/server/modules/reviews/service';
import type { PublicUser } from '@/server/modules/users/dto';
import { findActivePublicByIds } from '@/server/modules/users/service';
import {
  applyCatalogueQuery,
  monthOptionsFrom,
  statsFrom,
  type CatalogueQuery,
  type DifficultyStats,
  type TourListResult,
} from './catalogue-query';
import {
  hasCover,
  toCreditGroup,
  toTourDetail,
  toTourSummary,
  type CreditGroup,
  type TourDetail,
  type TourSummary,
} from './dto';
import type {
  ImagesInput,
  PhotoCreditInput,
  TourCreateInput,
  TourUpdateInput,
} from './schemas';
import { Tour, type TourDoc, type TourFields } from './model';

type TourRecord = TourFields & { _id: Types.ObjectId };

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/**
 * Reads every covered tour for the catalogue: no populate, so the catalogue holds no
 * guides and no reviews (B12). A tour with no cover is left out (D-13, ADR 0036), so
 * every public read that is built on the catalogue leaves it out too.
 *
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
async function loadCatalogue(): Promise<TourSummary[]> {
  await connectDb();
  try {
    const records = await Tour.find().sort({ name: 1 }).lean<TourRecord[]>();
    return records.filter((record) => hasCover(record)).map(toTourSummary);
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}

// One cache entry holds the whole public catalogue (ADR 0031). Sorting, paging and
// filtering run in memory on it, so no cache key ever contains a value from the URL (QA-12).
// React's cache() shares the one read between calls within a single request.
const readCatalogue = cache(() =>
  getDeps().cache.cached(loadCatalogue, ['catalogue'], ['tours'], {
    revalidate: 3600,
  })(),
);

/**
 * Lists tours for `/` and for GET /api/v1/tours (D-11, D-12). Both call this one
 * function, so the page and the API cannot drift (B13). Filtering, sorting and
 * paging run in memory on the cached catalogue, against today's IST day, so a
 * cached entry never freezes which departures are still bookable (QA-13).
 *
 * @param query - The filters, sort tokens, page, limit and clamp flag, already parsed.
 * @returns One page of tour summaries, with the total before paging.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function list(query: CatalogueQuery): Promise<TourListResult> {
  const catalogue = await readCatalogue();
  return applyCatalogueQuery(catalogue, query, toIstDay(now()));
}

/**
 * The month options for the filter form (D-04): each YYYY-MM with at least one
 * bookable departure, ascending.
 *
 * @returns The months, from the cached catalogue and today's IST day.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function monthOptions(): Promise<string[]> {
  const catalogue = await readCatalogue();
  return monthOptionsFrom(catalogue, toIstDay(now()));
}

/**
 * Every catalogue slug, in name order, for the sitemap (R10). Read from the cached
 * catalogue, so the sitemap adds no database read of its own.
 *
 * @returns The slugs; an empty array when the catalogue is empty.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function listSlugs(): Promise<string[]> {
  const catalogue = await readCatalogue();
  return catalogue.map((tour) => tour.slug);
}

/**
 * The tour statistics for GET /api/v1/tours/stats (F1): one row per difficulty.
 * Computed in memory from the cached catalogue, so the stats always agree with the
 * list and need no cache entry of their own (ADR 0031).
 *
 * @returns The rows for the difficulties present, easy, medium, difficult.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function getStats(): Promise<DifficultyStats[]> {
  return statsFrom(await readCatalogue());
}

/** One month of the monthly plan (F2). */
export type MonthlyPlanMonth = {
  /** 1 for January to 12 for December, in IST. */
  month: number;
  /** Every start date of the year that falls in this month, one per departure. */
  numTourStarts: number;
  /** The distinct names of the tours that start in this month, sorted. */
  tours: string[];
};

/**
 * The year's tour starts grouped by IST month for GET /api/v1/tours/monthly-plan/[year]
 * (F2). Every start date that falls in the calendar year counts, and months are cut in
 * Asia/Kolkata, so 1 January 00:00 IST is in January (QA-10). The result is not cached,
 * because its year comes from the URL (T-04-17).
 *
 * @param year - The four-digit year, already range-checked by the route (2000 to 2100).
 * @returns The months that have a start, in month order.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function getMonthlyPlan(
  year: number,
): Promise<MonthlyPlanMonth[]> {
  const { start } = istMonthBounds(`${year}-01`);
  const { end } = istMonthBounds(`${year}-12`);
  await connectDb();
  try {
    const rows = await Tour.aggregate<{
      _id: number;
      numTourStarts: number;
      tours: string[];
    }>([
      { $unwind: '$startDates' },
      { $match: { startDates: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { $month: { date: '$startDates', timezone: 'Asia/Kolkata' } },
          numTourStarts: { $sum: 1 },
          tours: { $addToSet: '$name' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return rows.map((row) => ({
      month: row._id,
      numTourStarts: row.numTourStarts,
      tours: [...row.tours].sort(),
    }));
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}

/** A point in the API's order: latitude and longitude, already range-checked by the route. */
export type GeoPoint = { lat: number; lng: number };

/** The radius of the Earth in each unit, so a distance becomes radians for $centerSphere (B3). */
const EARTH_RADIUS: Record<'mi' | 'km', number> = { mi: 3963.2, km: 6378.1 };

/** Metres to each unit, for $geoNear's distanceMultiplier (B3). */
const METRES_TO: Record<'mi' | 'km', number> = {
  mi: 0.000621371,
  km: 0.001,
};

/**
 * The tours whose start location lies inside a circle around a point (B3), as
 * summaries, by name. Not cached: the point comes from the URL (T-04-17). MongoDB
 * wants longitude first, so the point is passed as [lng, lat].
 *
 * @param input - The point, the radius and its unit (mi or km).
 * @returns The tours inside the radius; an empty array when none is.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function toursWithin(
  input: GeoPoint & { distance: number; unit: 'mi' | 'km' },
): Promise<TourSummary[]> {
  const radius = input.distance / EARTH_RADIUS[input.unit];
  await connectDb();
  try {
    const records = await Tour.find({
      imageCover: { $type: 'string' },
      startLocation: {
        $geoWithin: { $centerSphere: [[input.lng, input.lat], radius] },
      },
    })
      .sort({ name: 1, _id: 1 })
      .lean<TourRecord[]>();
    return records.map(toTourSummary);
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}

/** One tour and its distance from a point (B3). */
export type TourDistance = {
  id: string;
  name: string;
  slug: string;
  /** In the requested unit, rounded to 2 decimal places. */
  distance: number;
};

/**
 * Every tour's distance from a point, nearest first (B3), from a `$geoNear` that is the
 * first stage of the pipeline and uses the startLocation 2dsphere index. It returns
 * documents, never a query plan (B3). Not cached, for the same reason as toursWithin.
 *
 * @param input - The point and the unit the distances come back in (mi or km).
 * @returns Every tour, sorted by distance ascending.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function distancesFrom(
  input: GeoPoint & { unit: 'mi' | 'km' },
): Promise<TourDistance[]> {
  await connectDb();
  try {
    return await Tour.aggregate<TourDistance>([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [input.lng, input.lat] },
          key: 'startLocation',
          distanceField: 'distance',
          distanceMultiplier: METRES_TO[input.unit],
          spherical: true,
          query: { imageCover: { $type: 'string' } },
        },
      },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          name: 1,
          slug: 1,
          distance: { $round: ['$distance', 2] },
        },
      },
    ]);
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}

/**
 * Reads every tour's photos and credits for `/credits`, in seed order: createdAt
 * ascending, then id (U27). Only the fields the credits need are read.
 *
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
async function loadCredits(): Promise<CreditGroup[]> {
  await connectDb();
  try {
    const records = await Tour.find()
      .sort({ createdAt: 1, _id: 1 })
      .select({ name: 1, slug: 1, imageCover: 1, images: 1, photoCredits: 1 })
      .lean<TourRecord[]>();
    return records
      .filter((record) => hasCover(record))
      .flatMap((record) => toCreditGroup(record) ?? []);
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}

/**
 * Lists the photo credits for `/credits` (U27, D-10): one group per catalogue
 * tour, in createdAt then id order, each with the cover's credit first and then
 * the gallery in `images` order. A tour with no credited photo has no group.
 * Cached under `['credits']` with the `tours` tag, so any tour write clears it
 * along with the catalogue (ADR 0031).
 *
 * @returns The credit groups; an empty array when the catalogue is empty.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function listCredits(): Promise<CreditGroup[]> {
  return getDeps().cache.cached(loadCredits, ['credits'], ['tours'])();
}

/**
 * Reads one tour by id, with no populate (B12). Malformed ids and unknown ids
 * both give null, and nothing is cached here: the caller decides whether to cache.
 *
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
async function loadDetail(id: string): Promise<TourDetail | null> {
  if (!OBJECT_ID.test(id)) return null;
  await connectDb();
  try {
    const record = await Tour.findById(id).lean<TourRecord>();
    return record ? toTourDetail(record) : null;
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}

/**
 * Finds a tour for its page by slug (U11). The slug is looked up in the cached
 * catalogue first, so an unknown slug never creates a per-tour cache entry
 * (T-04-17). A known tour is read through the cache under `['tour-detail', id]`,
 * tagged `tour:<id>`, and the page and its metadata share one call per request.
 *
 * @param slug - The URL slug, as typed by the visitor.
 * @returns The tour detail, without its guides; or null when no tour has the slug.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function getBySlug(slug: string): Promise<TourDetail | null> {
  const entry = (await readCatalogue()).find((tour) => tour.slug === slug);
  if (!entry) return null;
  return getDeps().cache.cached(
    loadDetail,
    ['tour-detail', entry.id],
    [`tour:${entry.id}`],
  )(entry.id);
}

/**
 * Reads one tour by id for the API (B12, B13). It is uncached, so an id from the
 * URL never creates a cache entry (T-04-17).
 *
 * @param id - The 24-character hex tour id.
 * @returns The tour detail, without its guides.
 * @throws AppError NOT_FOUND when no tour has the id.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function getById(id: string): Promise<TourDetail> {
  const detail = await loadDetail(id);
  if (!detail) throw new AppError('NOT_FOUND');
  return detail;
}

/** The lead guide sorts ahead of the other guides (B12). */
function leadRank(user: PublicUser): number {
  return user.role === 'lead-guide' ? 0 : 1;
}

/**
 * Reads a tour's guides and puts the lead guide first, then the others in the
 * tour's own `guideIds` order (B12). Deactivated and missing guides are left out,
 * so a tour with none returns []. Guide names are returned as stored text.
 */
async function loadGuides(guideIds: string[]): Promise<PublicUser[]> {
  const people = await findActivePublicByIds(guideIds);
  const position = new Map(guideIds.map((id, index) => [id, index]));
  return people.sort(
    (a, b) =>
      leadRank(a) - leadRank(b) ||
      (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0),
  );
}

/**
 * The public guides of one tour (B12), cached under `['tour-guides', tourId]`
 * and tagged `tour:<tourId>`.
 *
 * @param tourId - The tour's id, which keys the cache entry.
 * @param guideIds - The tour's guide ids, in its own order (from `TourDetail.guideIds`).
 * @returns The guides with name, photo and role only: lead guide first, then the rest in order.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function getGuides(
  tourId: string,
  guideIds: string[],
): Promise<PublicUser[]> {
  return getDeps().cache.cached(
    loadGuides,
    ['tour-guides', tourId],
    [`tour:${tourId}`],
  )(guideIds);
}

/** A tour with its guides, as the write routes answer it (B13): the same shape as GET by id. */
export type TourWithGuides = TourDetail & { guides: PublicUser[] };

/** Reads a tour document by id for a write. A malformed id is absent, not an error. */
async function loadDocument(id: string): Promise<TourDoc | null> {
  if (!OBJECT_ID.test(id)) return null;
  await connectDb();
  const doc = await Tour.findById(id);
  return doc;
}

/**
 * Maps the validated input onto the model: start dates become 00:00 IST instants, and
 * the two points become GeoJSON (B19). Only the keys the caller sent are returned, so
 * an update never touches a field it does not name.
 */
function toModelFields(input: TourUpdateInput): Record<string, unknown> {
  const { startDates, startLocation, locations, ...rest } = input;
  return {
    ...rest,
    ...(startDates && { startDates: startDates.map((day) => fromIstDay(day)) }),
    ...(startLocation && {
      startLocation: { type: 'Point', ...startLocation },
    }),
    ...(locations && {
      locations: locations.map((stop) => ({ type: 'Point', ...stop })),
    }),
  };
}

/**
 * Every guide id must name an active user with the role guide or lead-guide (B12). A
 * missing, deactivated or other-role id is a 400 on the guides path, so no tour can list
 * a visitor, an admin or a missing account as its guide.
 *
 * @throws AppError VALIDATION_ERROR on the guides path when any id is not a guide.
 */
async function assertGuides(ids: string[] | undefined): Promise<void> {
  if (!ids || ids.length === 0) return;
  const people = await findActivePublicByIds(ids);
  const guides = new Set(
    people
      .filter(
        (person) => person.role === 'guide' || person.role === 'lead-guide',
      )
      .map((person) => person.id),
  );
  if (ids.some((id) => !guides.has(id))) {
    throw new AppError('VALIDATION_ERROR', undefined, [
      { path: 'guides', message: messages.validation.invalidValue },
    ]);
  }
}

/** A write that hits the unique name or slug index gets the approved 409 (copy.md). */
function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 11000
  );
}

/**
 * Maps a failed write. A duplicate name or slug is the approved CONFLICT; an outage
 * is SERVICE_UNAVAILABLE with the driver error as cause (B10); anything else is
 * returned unchanged, so validator errors reach the error mapper as they are.
 */
function writeFailure(error: unknown): unknown {
  if (isDuplicateKey(error)) {
    return new AppError('CONFLICT', messages.tours.duplicateName);
  }
  if (isDbUnavailableError(error)) {
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    return unavailable;
  }
  return error;
}

/** The saved tour with its guides, read after the cache has been cleared for it. */
async function detailWithGuides(doc: TourDoc): Promise<TourWithGuides> {
  const detail = toTourDetail(doc.toObject() as unknown as TourRecord);
  return { ...detail, guides: await getGuides(detail.id, detail.guideIds) };
}

/**
 * Creates a tour from JSON (F6, B4, D-13). The cover is optional: the tour has no photo
 * until one is added with its credit, and the public reads leave it out until then. The
 * `tours` tag is cleared once the save has finished.
 *
 * @param input - The tour, validated by `tourCreateSchema`.
 * @returns The saved tour, with `imageCover` null and its guides.
 * @throws AppError CONFLICT with the approved message when the name or slug is taken.
 * @throws AppError VALIDATION_ERROR on the guides path when a guide id is not a guide.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function createTour(
  input: TourCreateInput,
): Promise<TourWithGuides> {
  await assertGuides(input.guides);
  let doc: TourDoc;
  try {
    await connectDb();
    doc = await Tour.create(toModelFields(input));
  } catch (error) {
    throw writeFailure(error);
  }
  await getDeps().cache.invalidate('tours');
  return detailWithGuides(doc);
}

/**
 * Changes some of one tour's editable fields (B4, QA-04). The tour is loaded, the
 * fields are set and the document is saved, so the validators and the slug hook run:
 * a rename regenerates the slug. The tags `tours` and `tour:<id>` are cleared once the
 * save has finished.
 *
 * @param id - The tour's 24-character hex id, already checked by the route.
 * @param input - The fields to change, validated by `tourUpdateSchema`.
 * @returns The tour after the change, with its guides.
 * @throws AppError NOT_FOUND when no tour has the id.
 * @throws AppError CONFLICT with the approved message when the name or slug is taken.
 * @throws AppError VALIDATION_ERROR on the guides path when a guide id is not a guide.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function updateTour(
  id: string,
  input: TourUpdateInput,
): Promise<TourWithGuides> {
  let doc: TourDoc | null;
  try {
    doc = await loadDocument(id);
  } catch (error) {
    throw writeFailure(error);
  }
  if (!doc) throw new AppError('NOT_FOUND');
  await assertGuides(input.guides);
  doc.set(toModelFields(input));
  try {
    await doc.save();
  } catch (error) {
    throw writeFailure(error);
  }
  await getDeps().cache.invalidate('tours', `tour:${id}`);
  return detailWithGuides(doc);
}

/**
 * Removes stored photos, one key at a time (F6, S16). A key that cannot be removed is logged with
 * `message` and the next one is tried: the database has already moved on, so a photo that stays is
 * a storage clean-up for an operator, not a failed request.
 */
async function removePhotos(
  tourId: string,
  keys: Array<string | undefined>,
  message: string,
): Promise<void> {
  const storage = getDeps().storage;
  for (const key of keys) {
    if (!key) continue;
    try {
      await storage.delete(key);
    } catch (error) {
      getLogger().error({ tourId, key, err: error }, message);
    }
  }
}

/**
 * Deletes a tour that has no booking (F6, T-04-34), with its reviews and its stored photos. A
 * tour with any booking is refused before anything is removed, so no booking can point at a
 * deleted tour through the API. The tour goes first, then its reviews, then its photos, best
 * effort (ADR 0036 and ADR 0037). The tags `tours`, `tour:<id>` and `reviews:<id>` are cleared
 * once the database work has finished, even when it fails part way.
 *
 * @param id - The tour's 24-character hex id, already checked by the route.
 * @throws AppError NOT_FOUND when no tour has the id, which includes a second delete of the same tour.
 * @throws AppError CONFLICT with the approved message when the tour has any booking; nothing is removed.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function deleteTour(id: string): Promise<void> {
  let doc: TourDoc | null;
  try {
    doc = await loadDocument(id);
  } catch (error) {
    throw writeFailure(error);
  }
  if (!doc) throw new AppError('NOT_FOUND');
  if ((await countForTour(id)) > 0) {
    throw new AppError('CONFLICT', messages.tours.hasBookings);
  }
  try {
    await Tour.deleteOne({ _id: doc._id });
    await deleteForTour(id);
  } catch (error) {
    throw writeFailure(error);
  } finally {
    await getDeps().cache.invalidate('tours', `tour:${id}`, `reviews:${id}`);
  }
  await removePhotos(
    id,
    [doc.imageCover, ...doc.images],
    'stored photo not deleted after its tour was removed',
  );
}

/** One stored photo credit (U27), as the model keeps it. */
type PhotoCredit = TourFields['photoCredits'][number];

/** A 400 for a photo that arrived without its credit (U27). */
function creditMissing(path: string): AppError {
  return new AppError('VALIDATION_ERROR', undefined, [
    { path, message: messages.tours.creditMissing },
  ]);
}

/**
 * Replaces a tour's photos from an upload (S16, B4, D-13, D-14). Each file is checked and
 * re-encoded before anything is stored, stored under a random key, and given its credit. The
 * cover is replaced when one is uploaded, a cover-less tour gets one here, and the new key and
 * credit are saved in the same write (U27). Afterwards the tags `tours` and `tour:<id>` are
 * cleared, and the replaced keys are deleted best effort: a failed delete is logged and the
 * request still answers 200.
 *
 * @param id - The tour's 24-character hex id, already checked by the route.
 * @param input - The parsed upload, from `parseImagesForm`.
 * @returns The tour after the change, with its guides.
 * @throws AppError NOT_FOUND when no tour has the id.
 * @throws AppError PAYLOAD_TOO_LARGE or UNSUPPORTED_MEDIA_TYPE when a file is refused by `normalize`.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function replaceImages(
  id: string,
  input: ImagesInput,
): Promise<TourWithGuides> {
  let doc: TourDoc | null;
  try {
    doc = await loadDocument(id);
  } catch (error) {
    throw writeFailure(error);
  }
  if (!doc) throw new AppError('NOT_FOUND');

  // The route checks the credits too; the service repeats it so that U27 holds for any caller.
  if (input.cover && !input.credits.cover)
    throw creditMissing('credits.imageCover');
  if (input.gallery.length > input.credits.gallery.length) {
    throw creditMissing('credits.images');
  }

  // Every file is checked and re-encoded before anything is stored, so one refused file stores nothing.
  const coverWebp = input.cover
    ? await normalize(input.cover, 'tour')
    : undefined;
  const galleryWebp: Buffer[] = [];
  for (const bytes of input.gallery) {
    galleryWebp.push(await normalize(bytes, 'tour'));
  }

  const storage = getDeps().storage;
  const stored: string[] = [];
  const replaced: string[] = [];
  // Credits of the keys this upload added, by key. Kept keys keep their stored credit.
  const added = new Map<string, PhotoCreditInput>();

  const store = async (webp: Buffer): Promise<string> => {
    const key = randomImageKey('tours');
    await storage.put(key, webp, 'image/webp');
    stored.push(key);
    return key;
  };

  // Once a file is stored, any failure before the save removes what this request stored.
  try {
    let cover = doc.imageCover;
    if (coverWebp && input.credits.cover) {
      const key = await store(coverWebp);
      if (cover) replaced.push(cover);
      cover = key;
      added.set(key, input.credits.cover);
    }

    // Gallery file n replaces slot n; a slot past the current end is appended (D-14).
    const images = [...doc.images];
    for (const [slot, webp] of galleryWebp.entries()) {
      const credit = input.credits.gallery[slot];
      if (!credit) throw creditMissing('credits.images');
      const key = await store(webp);
      const previous = images[slot];
      if (previous !== undefined) {
        replaced.push(previous);
        images[slot] = key;
      } else {
        images.push(key);
      }
      added.set(key, credit);
    }

    // The cover first, then the gallery in order. Each key gets exactly one credit and no other
    // credit is kept, so no credit names a photo the tour no longer has (U27).
    const finalKeys = [cover, ...images].filter(
      (key): key is string => key !== undefined,
    );
    const credits = new Map<string, PhotoCredit>();
    for (const credit of doc.toObject().photoCredits) {
      if (finalKeys.includes(credit.file) && !credits.has(credit.file)) {
        credits.set(credit.file, credit);
      }
    }
    for (const [key, credit] of added) {
      credits.set(key, { ...credit, file: key });
    }
    doc.set({
      imageCover: cover,
      images,
      photoCredits: finalKeys.flatMap((key) => credits.get(key) ?? []),
    });

    await doc.save();
  } catch (error) {
    await removePhotos(
      id,
      stored,
      'stored upload not deleted after the upload failed',
    );
    throw writeFailure(error);
  }
  await getDeps().cache.invalidate('tours', `tour:${id}`);
  await removePhotos(
    id,
    replaced,
    'stored photo not deleted after its image was replaced',
  );
  return detailWithGuides(doc);
}
