import { describe, expect, it, vi } from 'vitest';
import { createFakeCache } from '@/server/adapters/cache';

describe('fake cache', () => {
  it('[Q7] cached calls the function every time and passes its arguments through', async () => {
    const cache = createFakeCache();
    const readTour = vi.fn(async (slug: string) => ({ slug }));
    const cachedRead = cache.cached(readTour, ['tours'], ['tours']);
    expect(await cachedRead('valley-of-flowers-trek')).toEqual({
      slug: 'valley-of-flowers-trek',
    });
    await cachedRead('valley-of-flowers-trek');
    expect(readTour).toHaveBeenCalledTimes(2);
    expect(readTour).toHaveBeenLastCalledWith('valley-of-flowers-trek');
  });

  it('[Q7] invalidate records every tag in order', async () => {
    const cache = createFakeCache();
    await cache.invalidate('tours', 'tour:1');
    await cache.invalidate('reviews');
    expect(cache.invalidated).toEqual(['tours', 'tour:1', 'reviews']);
  });

  it('[Q7] reset clears the recorded tags', async () => {
    const cache = createFakeCache();
    await cache.invalidate('tours');
    cache.reset();
    expect(cache.invalidated).toHaveLength(0);
  });
});
