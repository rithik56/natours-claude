import 'server-only';
import mongoose from 'mongoose';
import { getConfig } from './config';

const g = globalThis as typeof globalThis & {
  __natoursMongo?: Promise<typeof mongoose>;
};

/**
 * Connects once per process and shares the promise across hot reloads (B17).
 * Fails fast when MongoDB is unreachable (B10) and clears a rejected attempt so
 * the next call retries.
 */
export function connectDb(): Promise<typeof mongoose> {
  if (!g.__natoursMongo) {
    const config = getConfig();
    const attempt = mongoose.connect(config.MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: config.DB_SERVER_SELECTION_TIMEOUT_MS,
    });
    g.__natoursMongo = attempt.catch((error: unknown) => {
      g.__natoursMongo = undefined;
      throw error;
    });
  }
  return g.__natoursMongo;
}

/** True when MongoDB answers a ping. Never throws and never exposes the error. */
export async function pingDb(): Promise<boolean> {
  try {
    const { connection } = await connectDb();
    const db = connection.db;
    if (!db) return false;
    await db.admin().ping();
    return true;
  } catch {
    return false;
  }
}

export async function disconnectDb(): Promise<void> {}

export function isDbUnavailableError(_error: unknown): boolean {
  return false;
}
