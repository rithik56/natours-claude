import 'server-only';
import { cache } from 'react';
import type { Types } from 'mongoose';
import { toIstDay } from '@/lib/ist';
import { now } from '@/server/clock';
import { connectDb, isDbUnavailableError } from '@/server/db';
import { getDeps } from '@/server/deps';
import { AppError } from '@/server/errors';
import type { PublicUser } from '@/server/modules/users/dto';
import { findActivePublicByIds } from '@/server/modules/users/service';
import {
  applyCatalogueQuery,
  monthOptionsFrom,
  type CatalogueQuery,
  type TourListResult,
} from './catalogue-query';
import {
  toCreditGroup,
  toTourDetail,
  toTourSummary,
  type CreditGroup,
  type TourDetail,
  type TourSummary,
} from './dto';
import { Tour, type TourFields } from './model';

type TourRecord = TourFields & { _id: Types.ObjectId };

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/**
 * Reads every tour for the catalogue: no filter and no populate, so the
 * catalogue holds no guides and no reviews (B12).
 *
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
async function loadCatalogue(): Promise<TourSummary[]> {
  await connectDb();
  try {
    const records = await Tour.find().sort({ name: 1 }).lean<TourRecord[]>();
    return records.map(toTourSummary);
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
    return records.flatMap((record) => toCreditGroup(record) ?? []);
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
