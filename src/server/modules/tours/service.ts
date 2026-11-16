import 'server-only';
import { cache } from 'react';
import type { Types } from 'mongoose';
import { connectDb, isDbUnavailableError } from '@/server/db';
import { getDeps } from '@/server/deps';
import { AppError } from '@/server/errors';
import {
  applyCatalogueQuery,
  type CatalogueQuery,
  type TourListResult,
} from './catalogue-query';
import { toTourSummary, type TourSummary } from './dto';
import { Tour, type TourFields } from './model';

type TourRecord = TourFields & { _id: Types.ObjectId };

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
 * function, so the page and the API cannot drift (B13).
 *
 * @param query - The sort tokens, page, limit and clamp flag, already parsed.
 * @returns One page of tour summaries, with the total before paging.
 * @throws AppError SERVICE_UNAVAILABLE when MongoDB cannot be reached (B10).
 */
export async function list(query: CatalogueQuery): Promise<TourListResult> {
  const catalogue = await readCatalogue();
  return applyCatalogueQuery(catalogue, query);
}
