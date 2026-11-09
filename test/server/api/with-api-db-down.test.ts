import { afterEach, describe, expect, it, vi } from 'vitest';
import { callRoute } from '../../helpers/call-route';

type MongoCache = { __natoursMongo?: unknown };

describe('withApi with MongoDB down', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as MongoCache).__natoursMongo;
  });

  it('[B10] two concurrent calls to an auth route both get 503 within the selection timeout', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:1/natours');
    vi.stubEnv('DB_SERVER_SELECTION_TIMEOUT_MS', '500');
    delete (globalThis as MongoCache).__natoursMongo;
    vi.resetModules();
    const { withApi } = await import('@/server/api/with-api');
    const { ok } = await import('@/server/api/responses');
    const guarded = {
      GET: withApi(async () => ok({}), { access: 'auth' }),
    };
    const someone = { id: '6579a1b2c3d4e5f607182930' };

    const startedAt = Date.now();
    const [first, second] = await Promise.all([
      callRoute(guarded, { path: '/x', as: someone }),
      callRoute(guarded, { path: '/x', as: someone }),
    ]);
    const elapsed = Date.now() - startedAt;

    for (const result of [first, second]) {
      expect(result.status).toBe(503);
      expect((result.body as { error: { code: string } }).error.code).toBe(
        'SERVICE_UNAVAILABLE',
      );
      expect(JSON.stringify(result.body)).not.toMatch(
        /127\.0\.0\.1|ECONNREFUSED|Mongo.*Error/,
      );
    }
    expect(elapsed).toBeLessThan(3000);
  }, 10_000);
});
