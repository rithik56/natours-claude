import 'server-only';
import mongoose from 'mongoose';
import { getConfig } from './config';
import { AppError } from './errors';

const g = globalThis as typeof globalThis & {
  __natoursMongo?: Promise<typeof mongoose>;
};

const UNAVAILABLE_ERROR_NAMES = new Set([
  'MongooseServerSelectionError',
  'MongoServerSelectionError',
  'MongoNetworkError',
]);

/**
 * True for errors that mean MongoDB cannot be reached: server selection and
 * network failures, a query before the initial connection finished, and the
 * AppError that connectDb raises for them. Callers answer 503 for these (B10).
 */
export function isDbUnavailableError(error: unknown): boolean {
  if (error instanceof AppError) return error.code === 'SERVICE_UNAVAILABLE';
  if (!(error instanceof Error)) return false;
  if (UNAVAILABLE_ERROR_NAMES.has(error.name)) return true;
  return (
    error.name === 'MongooseError' &&
    error.message.includes('before initial connection')
  );
}

/**
 * Connects once per process and shares the promise across hot reloads (B17).
 * When MongoDB is unreachable the promise rejects with SERVICE_UNAVAILABLE
 * within the server selection timeout (B10), carrying the driver error as
 * `cause` for the logs. A rejected attempt is not cached, so the next call
 * tries again (QA-19).
 */
export function connectDb(): Promise<typeof mongoose> {
  if (!g.__natoursMongo) {
    const config = getConfig();
    const attempt: Promise<typeof mongoose> = mongoose
      .connect(config.MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: config.DB_SERVER_SELECTION_TIMEOUT_MS,
      })
      .catch((error: unknown) => {
        if (g.__natoursMongo === attempt) g.__natoursMongo = undefined;
        const unavailable = new AppError('SERVICE_UNAVAILABLE');
        unavailable.cause = error;
        throw unavailable;
      });
    g.__natoursMongo = attempt;
  }
  return g.__natoursMongo;
}

/** Closes the connection and forgets the cached promise. Used by tests and by graceful shutdown. */
export async function disconnectDb(): Promise<void> {
  g.__natoursMongo = undefined;
  await mongoose.disconnect();
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
