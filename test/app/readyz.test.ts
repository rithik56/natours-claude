import { describe, expect, it } from 'vitest';
import { GET } from '@/app/readyz/route';
import { connectDb } from '@/server/db';

describe('/readyz with MongoDB up', () => {
  it('[B10] /readyz answers 200 with status ready when MongoDB answers', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ status: 'ready', checks: { mongo: 'up' } });
  });

  it('[B17] connectDb returns the same promise on every call', async () => {
    const first = connectDb();
    const second = connectDb();

    expect(second).toBe(first);
    await first;
  });
});
