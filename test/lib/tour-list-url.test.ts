import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  listHref,
  type PageQuery,
} from '@/lib/tour-list-url';

const defaults: PageQuery = {
  sort: '-ratingsAverage',
  page: 1,
  limit: 12,
};

describe('[U10] listHref', () => {
  it('is plain / when every field is at its default', () => {
    expect(listHref(defaults)).toBe('/');
  });

  it('omits the default sort and page 1 and keeps a filter (shareable URL)', () => {
    expect(listHref({ ...defaults, difficulty: 'easy' })).toBe(
      '/?difficulty=easy',
    );
  });

  it('keeps non-default values in the fixed key order', () => {
    const href = listHref({
      difficulty: 'medium',
      length: '5-6',
      month: '2027-01',
      maxPrice: 30000,
      sort: 'price',
      page: 2,
      limit: 6,
    });
    expect(href).toBe(
      '/?difficulty=medium&length=5-6&month=2027-01&maxPrice=30000&sort=price&page=2&limit=6',
    );
  });

  it('patches one field and keeps every other parameter', () => {
    const query = {
      ...defaults,
      difficulty: 'easy' as const,
      length: '3-4' as const,
    };
    expect(listHref(query, { page: 2 })).toBe(
      '/?difficulty=easy&length=3-4&page=2',
    );
  });

  it('removes a field whose patch is undefined', () => {
    const query = { ...defaults, difficulty: 'easy' as const };
    expect(listHref(query, { difficulty: undefined })).toBe('/');
  });
});

describe('[U10] activeFilterCount', () => {
  it('counts difficulty, length, month and max price only', () => {
    expect(
      activeFilterCount({
        ...defaults,
        difficulty: 'easy',
        length: '3-4',
        month: '2026-12',
        maxPrice: 20000,
      }),
    ).toBe(4);
  });

  it('does not count a non-default sort or a later page (D-01)', () => {
    expect(activeFilterCount({ ...defaults, sort: 'price', page: 2 })).toBe(0);
  });
});
