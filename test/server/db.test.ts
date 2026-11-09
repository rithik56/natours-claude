import mongoose, { Schema } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectDb, disconnectDb, isDbUnavailableError } from '@/server/db';
import { AppError } from '@/server/errors';
import { registerModel, withUpdateValidators } from '@/server/schema-helpers';

type MongoCache = { __natoursMongo?: unknown };
const cache = globalThis as MongoCache;

function namedError(name: string, message = 'failure'): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

// getConfig caches its first read, so each unreachable-database test loads fresh modules.
async function loadDbWithoutMongo() {
  vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:1/natours');
  vi.stubEnv('DB_SERVER_SELECTION_TIMEOUT_MS', '500');
  vi.resetModules();
  delete cache.__natoursMongo;
  return import('@/server/db');
}

describe('connectDb when MongoDB is unreachable', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    await mongoose.disconnect();
    delete cache.__natoursMongo;
  });

  it('[B10] rejects with SERVICE_UNAVAILABLE within the selection timeout', async () => {
    const db = await loadDbWithoutMongo();

    const startedAt = Date.now();
    const outcome = await db.connectDb().catch((error: unknown) => error);
    const elapsed = Date.now() - startedAt;

    expect(outcome).toMatchObject({
      name: 'AppError',
      code: 'SERVICE_UNAVAILABLE',
      status: 503,
    });
    expect((outcome as Error).cause).toBeDefined();
    expect(db.isDbUnavailableError(outcome)).toBe(true);
    expect(elapsed).toBeLessThan(3000);
  }, 10_000);

  it('[B10] two concurrent calls both reject, and the cache is left empty', async () => {
    const db = await loadDbWithoutMongo();

    const outcomes = await Promise.allSettled([db.connectDb(), db.connectDb()]);

    for (const outcome of outcomes) {
      expect(outcome.status).toBe('rejected');
      expect((outcome as PromiseRejectedResult).reason).toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
      });
    }
    expect(cache.__natoursMongo).toBeUndefined();
  }, 10_000);

  it('[B10] a failed attempt is not cached, so the next call connects again', async () => {
    const db = await loadDbWithoutMongo();
    const connect = vi.spyOn(mongoose, 'connect');

    await expect(db.connectDb()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
    const afterFirst = connect.mock.calls.length;
    await expect(db.connectDb()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });

    expect(afterFirst).toBe(1);
    expect(connect.mock.calls.length).toBe(2);
  }, 10_000);
});

describe('connectDb against the in-memory database', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await disconnectDb();
  });

  it('[B17] ten concurrent calls make one connect call and share one connection', async () => {
    await disconnectDb();
    const connect = vi.spyOn(mongoose, 'connect');

    const results = await Promise.all(
      Array.from({ length: 10 }, () => connectDb()),
    );

    expect(connect).toHaveBeenCalledTimes(1);
    for (const result of results) expect(result).toBe(results[0]);
  });

  it('disconnectDb closes the connection and empties the cache', async () => {
    await connectDb();

    await disconnectDb();

    expect(cache.__natoursMongo).toBeUndefined();
    expect(mongoose.connection.readyState).toBe(0);
  });
});

describe('isDbUnavailableError', () => {
  it.each([
    'MongooseServerSelectionError',
    'MongoServerSelectionError',
    'MongoNetworkError',
  ])('[B10] is true for %s', (name) => {
    expect(isDbUnavailableError(namedError(name))).toBe(true);
  });

  it('[B10] is true for the error raised before the initial connection completes', () => {
    const error = namedError(
      'MongooseError',
      'Cannot call `users.findOne()` before initial connection is complete if `bufferCommands = false`.',
    );

    expect(isDbUnavailableError(error)).toBe(true);
  });

  it('[B10] is true for AppError SERVICE_UNAVAILABLE', () => {
    expect(isDbUnavailableError(new AppError('SERVICE_UNAVAILABLE'))).toBe(
      true,
    );
  });

  it('[B10] is false for other errors and non-errors', () => {
    expect(isDbUnavailableError(new Error('boom'))).toBe(false);
    expect(isDbUnavailableError(namedError('CastError'))).toBe(false);
    expect(isDbUnavailableError(new AppError('NOT_FOUND'))).toBe(false);
    expect(isDbUnavailableError('MongoNetworkError')).toBe(false);
    expect(isDbUnavailableError(undefined)).toBe(false);
  });
});

describe('registerModel', () => {
  it('[B17] returns the same model when called twice for one name', () => {
    const schema = new Schema({ label: String });

    const first = registerModel('RegisterTwice', schema);
    const second = registerModel(
      'RegisterTwice',
      new Schema({ label: String }),
    );

    expect(second).toBe(first);
    expect(first.modelName).toBe('RegisterTwice');
  });
});

describe('withUpdateValidators', () => {
  it('runs validators on findOneAndUpdate', async () => {
    await connectDb();
    const schema = withUpdateValidators(
      new Schema({ label: { type: String, minlength: 3 } }),
    );
    const Sample = registerModel('UpdateValidated', schema);
    await Sample.init();
    const created = await Sample.create({ label: 'long enough' });

    await expect(
      Sample.findOneAndUpdate({ _id: created._id }, { label: 'ab' }),
    ).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(
      Sample.updateOne({ _id: created._id }, { label: 'ab' }),
    ).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(
      Sample.updateMany({ _id: created._id }, { label: 'ab' }),
    ).rejects.toMatchObject({ name: 'ValidationError' });

    await disconnectDb();
  });
});
