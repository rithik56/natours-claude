import { afterEach, describe, expect, it, vi } from 'vitest';
import { callRoute } from '../helpers/call-route';

type MongoCache = { __natoursMongo?: unknown };

describe('/readyz with MongoDB down', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as MongoCache).__natoursMongo;
  });

  it('[B10] /readyz reports not ready within the selection timeout', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:1/natours');
    vi.stubEnv('DB_SERVER_SELECTION_TIMEOUT_MS', '500');
    delete (globalThis as MongoCache).__natoursMongo;
    vi.resetModules();
    const route = await import('@/app/readyz/route');

    const startedAt = Date.now();
    const result = await callRoute(route, { path: '/readyz' });
    const elapsed = Date.now() - startedAt;

    expect(result.status).toBe(503);
    expect(elapsed).toBeLessThan(3000);
    expect(result.body).toEqual({
      status: 'not-ready',
      checks: { mongo: 'down' },
    });
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(result.headers.get('x-request-id')).not.toBeNull();
    expect(JSON.stringify(result.body)).not.toMatch(
      /127\.0\.0\.1|ECONNREFUSED|Mongo.*Error/,
    );
  }, 10_000);

  it('[B17] a failed connection attempt is not cached, so the next call retries', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:1/natours');
    vi.stubEnv('DB_SERVER_SELECTION_TIMEOUT_MS', '500');
    delete (globalThis as MongoCache).__natoursMongo;
    vi.resetModules();
    const { connectDb } = await import('@/server/db');

    await expect(connectDb()).rejects.toThrow();

    expect((globalThis as MongoCache).__natoursMongo).toBeUndefined();
  }, 10_000);
});
