import { describe, expect, it } from 'vitest';
import * as media from '@/app/media/[...key]/route';
import { callRoute } from '../helpers/call-route';
import { fakes } from '../helpers/fakes';

const COVER = 'tours/valley-of-flowers-trek-cover.jpg';

describe('/media/[...key]', () => {
  it('[D2] serves a stored photo with its content type and a one-day cache', async () => {
    await fakes.storage.put(COVER, Buffer.from('jpeg-bytes'), 'image/jpeg');

    const result = await callRoute(media, {
      path: `/media/${COVER}`,
      params: { key: ['tours', 'valley-of-flowers-trek-cover.jpg'] },
    });

    expect(result.status).toBe(200);
    expect(result.headers.get('content-type')).toBe('image/jpeg');
    expect(result.headers.get('cache-control')).toBe('public, max-age=86400');
    expect(result.body).toBe('jpeg-bytes');
  });

  it('[D2] answers 404 NOT_FOUND for a well-formed key that is not stored', async () => {
    const result = await callRoute(media, {
      path: '/media/tours/never-uploaded.jpg',
      params: { key: ['tours', 'never-uploaded.jpg'] },
    });

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({
      status: 'fail',
      error: { code: 'NOT_FOUND' },
    });
  });

  it.each([
    ['a dot-dot segment', { key: ['..'] }],
    ['an uppercase segment', { key: ['tours', 'Cover.jpg'] }],
    ['five segments', { key: ['a', 'b', 'c', 'd', 'e.jpg'] }],
    ['an empty key', { key: [] }],
    ['an unknown parameter', { key: ['a.jpg'], other: 'x' }],
  ])('[D2] answers 400 for a path with %s', async (_, params) => {
    const result = await callRoute(media, {
      path: '/media/x',
      params,
    });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });
});
