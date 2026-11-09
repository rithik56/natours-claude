import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { connectDb, disconnectDb } from '@/server/db';

/** Deletes every document in every collection of the test database. */
export async function clearDatabase(): Promise<void> {
  const { db } = mongoose.connection;
  if (!db) return;
  const collections = await db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

/**
 * Connects to this test file's in-memory database, builds indexes for every
 * registered model (QA-18) and empties the collections after each test.
 */
export function useTestDatabase(): void {
  beforeAll(async () => {
    await connectDb();
    await Promise.all(
      Object.values(mongoose.models).map((model) => model.init()),
    );
  });
  afterEach(clearDatabase);
  afterAll(disconnectDb);
}
