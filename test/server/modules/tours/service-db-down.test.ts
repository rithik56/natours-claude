import { afterEach, describe, expect, it, vi } from 'vitest';

type MongoCache = { __natoursMongo?: unknown };

describe('tours service with MongoDB down', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as MongoCache).__natoursMongo;
  });

  it('[B10] list refuses with SERVICE_UNAVAILABLE and the driver error stays out of the error', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:1/natours');
    vi.stubEnv('DB_SERVER_SELECTION_TIMEOUT_MS', '500');
    delete (globalThis as MongoCache).__natoursMongo;
    vi.resetModules();
    const { list } = await import('@/server/modules/tours/service');

    const error = await list({
      sort: ['-ratingsAverage'],
      page: 1,
      limit: 12,
      clampPage: true,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    expect(String((error as Error).message)).not.toMatch(
      /127\.0\.0\.1|ECONNREFUSED|Mongo.*Error/,
    );
  }, 10_000);
});
