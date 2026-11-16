import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getConfig } from '@/server/config';
import { connectDb } from '@/server/db';
import { getDeps } from '@/server/deps';
import { Tour } from '@/server/modules/tours/model';
import {
  listSeedPhotos,
  PHOTO_KEY_PREFIX,
  SEED_DIRECTORY,
  seedTourRecords,
  toTourDocument,
} from './load';

// SEC-16: the seed runs only where it is meant to. The check reads APP_ENV, never NODE_ENV (ARC-10).
const SEED_APP_ENVS: readonly string[] = [
  'development',
  'test',
  'ci',
  'staging',
];
const RESET_APP_ENVS: readonly string[] = ['development', 'test', 'ci'];

/** Throws before any connection unless this APP_ENV may be seeded, and `reset` only where it may be wiped. */
export function assertSeedAllowed({
  appEnv,
  reset,
}: {
  appEnv: string;
  reset: boolean;
}): void {
  if (!SEED_APP_ENVS.includes(appEnv)) {
    throw new Error(
      `the seed runs only when APP_ENV is development, test, ci or staging, not ${appEnv}`,
    );
  }
  if (reset && !RESET_APP_ENVS.includes(appEnv)) {
    throw new Error('--reset runs only when APP_ENV is development, test or ci');
  }
}

/** Every field but _id, which never changes once the document exists. */
function withoutId<T extends { _id: unknown }>(doc: T): Omit<T, '_id'> {
  return Object.fromEntries(
    Object.entries(doc).filter(([key]) => key !== '_id'),
  ) as Omit<T, '_id'>;
}

// D10: the upload goes through the same storage adapter the app reads, so `/media` serves the bytes (D2).
async function uploadPhotos(): Promise<void> {
  const { storage } = getDeps();
  for (const file of listSeedPhotos()) {
    const bytes = readFileSync(path.join(SEED_DIRECTORY, 'img', 'tours', file));
    await storage.put(`${PHOTO_KEY_PREFIX}${file}`, bytes, 'image/jpeg');
  }
}

// Create when missing, otherwise set the desired fields and save only when something changed.
async function loadTours(): Promise<void> {
  for (const [index, record] of seedTourRecords().entries()) {
    const desired = toTourDocument(record, index);
    const existing = await Tour.findById(desired._id);
    if (existing === null) {
      await Tour.create(desired);
      continue;
    }
    existing.set(withoutId(desired));
    if (existing.isModified()) await existing.save();
  }
}

/**
 * Loads the seed into the database and the storage adapter. Idempotent: a second run changes nothing.
 * Refuses before connecting unless APP_ENV allows it (SEC-16).
 */
export async function runSeed({ reset }: { reset: boolean }): Promise<void> {
  assertSeedAllowed({ appEnv: getConfig().APP_ENV, reset });
  await connectDb();
  await Tour.syncIndexes();
  await uploadPhotos();
  await loadTours();
}
