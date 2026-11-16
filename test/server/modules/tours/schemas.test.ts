import { describe, expect, it } from 'vitest';
import { parseQuery, searchParamsToRecord } from '@/server/api/parse-query';
import {
  apiListQuerySchema,
  buildPageQuerySchema,
  LENGTH_BANDS,
  PAGE_SORTS,
  PRICE_BANDS,
} from '@/server/modules/tours/schemas';

const MONTHS = ['2026-11', '2027-01'];

/** `/` reads its query leniently: an invalid field falls back to its default (plan.md 4.3). */
function page(search: string): Record<string, unknown> {
  return parseQuery(
    buildPageQuerySchema(MONTHS),
    new URLSearchParams(search),
  ) as Record<string, unknown>;
}

/** The API reads its query strictly, through the same record withApi builds. */
function api(search: string): Record<string, unknown> {
  return apiListQuerySchema.parse(
    searchParamsToRecord(new URLSearchParams(search)),
  ) as Record<string, unknown>;
}

function apiRefuses(search: string): void {
  expect(() => api(search)).toThrow();
}

describe('band and sort constants', () => {
  it('[U10] the length bands are inclusive ranges, and the price bands are the three approved amounts', () => {
    expect(LENGTH_BANDS).toEqual({
      '3-4': [3, 4],
      '5-6': [5, 6],
      '7-8': [7, 8],
    });
    expect(PRICE_BANDS).toEqual([20000, 30000, 40000]);
  });

  it('[B1] the page sorts are the five approved tokens', () => {
    expect([...PAGE_SORTS]).toEqual([
      '-ratingsAverage',
      'price',
      '-price',
      'duration',
      '-duration',
    ]);
  });
});

describe('the page query (lenient, D-02, B1, B11)', () => {
  it('[U10] a length band that exists is kept, and an unknown one is dropped', () => {
    expect(page('length=3-4').length).toBe('3-4');
    expect(page('length=4-5').length).toBeUndefined();
  });

  it('[U10] a price band is read as a number, and any other amount is dropped', () => {
    expect(page('maxPrice=20000').maxPrice).toBe(20000);
    expect(page('maxPrice=25000').maxPrice).toBeUndefined();
  });

  it('[U10] difficulty keeps the three values and drops any other', () => {
    expect(page('difficulty=easy').difficulty).toBe('easy');
    expect(page('difficulty=hard').difficulty).toBeUndefined();
  });

  it('[U10] a month is kept only when it is one of the derived options', () => {
    expect(page('month=2027-01').month).toBe('2027-01');
    expect(page('month=2027-05').month).toBeUndefined();
  });

  it('[B1] the sort defaults to -ratingsAverage, and any other token falls back to it', () => {
    expect(page('').sort).toBe('-ratingsAverage');
    expect(page('sort=price').sort).toBe('price');
    expect(page('sort=Price').sort).toBe('-ratingsAverage');
    expect(page('sort=name').sort).toBe('-ratingsAverage');
    expect(page('sort=price,-price').sort).toBe('-ratingsAverage');
  });

  it('[B11] page defaults to 1; a bad page falls back to 1, and a large page is kept for clamping', () => {
    expect(page('').page).toBe(1);
    expect(page('page=2').page).toBe(2);
    expect(page('page=0').page).toBe(1);
    expect(page('page=1.5').page).toBe(1);
    expect(page('page=+2').page).toBe(1);
    expect(page('page=1e1').page).toBe(1);
    expect(page('page=99').page).toBe(99);
  });

  it('[B11] limit defaults to 12, accepts 1 to 100, and falls back to 12 otherwise', () => {
    expect(page('').limit).toBe(12);
    expect(page('limit=1').limit).toBe(1);
    expect(page('limit=100').limit).toBe(100);
    expect(page('limit=101').limit).toBe(12);
    expect(page('limit=0').limit).toBe(12);
  });

  it('[S7] unknown keys, such as an operator or a name, are dropped', () => {
    const parsed = page('name=Ladakh&price[$gt]=1&__proto__=x');

    expect(parsed).not.toHaveProperty('name');
    expect(parsed).not.toHaveProperty('price[$gt]');
  });
});

describe('the API query (strict, S7, B1, B11)', () => {
  it('[S7] price[gte] and price[gt] are numeric filters on the API', () => {
    expect(api('price[gte]=12999')['price[gte]']).toBe(12999);
    expect(api('price[gt]=12999')['price[gt]']).toBe(12999);
  });

  it('[S7] operator injection, unknown keys and a non-enum difficulty are refused', () => {
    apiRefuses('price[$gt]=1');
    apiRefuses('__proto__=x');
    apiRefuses('name=Ladakh');
    apiRefuses('difficulty=hard');
  });

  it('[B1] a sort of five distinct tokens is accepted, and six or a repeated field is refused', () => {
    expect(
      api('sort=price,-duration,ratingsAverage,-maxGroupSize,name').sort,
    ).toEqual([
      'price',
      '-duration',
      'ratingsAverage',
      '-maxGroupSize',
      'name',
    ]);
    apiRefuses(
      'sort=price,-duration,ratingsAverage,-maxGroupSize,name,createdAt',
    );
    apiRefuses('sort=price,-price');
  });

  it('[B1] an empty sort, a sort with the wrong case, and an unknown field are refused', () => {
    apiRefuses('sort=');
    apiRefuses('sort=Price');
    apiRefuses('sort=-');
  });

  it('[B11] limit 1 and limit 100 are accepted', () => {
    expect(api('limit=1').limit).toBe(1);
    expect(api('limit=100').limit).toBe(100);
  });

  it('[B11] page 0, limit 0, limit 101, and page values that are not base-10 digits are refused', () => {
    apiRefuses('page=0');
    apiRefuses('limit=0');
    apiRefuses('limit=101');
    apiRefuses('page=1.5');
    apiRefuses('limit=1e1');
    apiRefuses('page=%2B2');
    apiRefuses('page=%201');
  });

  it('[B11] fields lists TourSummary keys only, and an unknown or empty list is refused', () => {
    expect(api('fields=name,price').fields).toEqual(['name', 'price']);
    apiRefuses('fields=hidden');
    apiRefuses('fields=');
  });

  it('[B11] an absent page and limit stay absent, so the API converter applies its defaults', () => {
    const parsed = api('');

    expect(parsed.page).toBeUndefined();
    expect(parsed.limit).toBeUndefined();
  });
});
