import { describe, expect, it } from 'vitest';
import * as readyz from '@/app/readyz/route';
import { connectDb } from '@/server/db';
import { callRoute } from '../helpers/call-route';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('/readyz with MongoDB up', () => {
  it('[B10] /readyz answers 200 with status ready when MongoDB answers', async () => {
    const result = await callRoute(readyz, {
      method: 'GET',
      path: '/readyz',
    });

    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(result.body).toEqual({
      status: 'ready',
      checks: { mongo: 'up' },
    });
  });

  it('[D7] /readyz goes through the pipeline and carries a request ID', async () => {
    const result = await callRoute(readyz, { path: '/readyz' });

    expect(UUID.test(result.headers.get('x-request-id') ?? '')).toBe(true);
  });

  it('[S1] /readyz is public: an anonymous caller with an unreadable cookie gets 200', async () => {
    const result = await callRoute(readyz, {
      path: '/readyz',
      headers: { cookie: 'natours_session=not-a-token' },
    });

    expect(result.status).toBe(200);
  });

  it('[B17] connectDb returns the same promise on every call', async () => {
    const first = connectDb();
    const second = connectDb();

    expect(second).toBe(first);
    await first;
  });
});
