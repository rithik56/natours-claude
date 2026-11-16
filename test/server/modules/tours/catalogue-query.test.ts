import { describe, expect, it } from 'vitest';
import {
  applyCatalogueQuery,
  monthOptionsFrom,
  nextBookableDate,
  statsFrom,
  type CatalogueEntry,
  type CatalogueQuery,
} from '@/server/modules/tours/catalogue-query';
import { seedTours } from '../../../helpers/seed';

// Today is 8 Nov 2026 IST, the pinned day for the app specs (ADR 0030).
const TODAY = '2026-11-08';
const CREATED = '2026-11-08T00:00:00.000Z';

type SeedWithStart = ReturnType<typeof seedTours>[number] & {
  startLocation: {
    coordinates: number[];
    address: string;
    description: string;
  };
};

/** The 13 real seed tours as catalogue entries (seed/data/tours.json). */
function seedEntries(): CatalogueEntry[] {
  return (seedTours() as SeedWithStart[]).map((record) => ({
    id: record._id,
    name: record.name,
    slug: record.slug,
    duration: record.duration,
    maxGroupSize: record.maxGroupSize,
    difficulty: record.difficulty,
    price: record.price,
    ratingsAverage: record.ratingsAverage,
    ratingsQuantity: record.ratingsQuantity,
    summary: record.summary,
    imageCover: record.imageCover,
    startDates: record.startDates,
    createdAt: CREATED,
    startLocation: {
      coordinates: [...record.startLocation.coordinates],
      address: record.startLocation.address,
      description: record.startLocation.description,
    },
  }));
}

function byName(entries: CatalogueEntry[], name: string): CatalogueEntry {
  const found = entries.find((entry) => entry.name === name);
  if (!found) throw new Error(`no seed tour named ${name}`);
  return found;
}

function query(overrides: Partial<CatalogueQuery> = {}): CatalogueQuery {
  return {
    sort: ['-ratingsAverage'],
    page: 1,
    limit: 12,
    clampPage: false,
    ...overrides,
  };
}

const ALL_SORTS = [
  'price',
  '-price',
  'duration',
  '-duration',
  '-ratingsAverage',
  'ratingsAverage',
  '-createdAt',
  'maxGroupSize',
];

describe('applyCatalogueQuery: paging and ordering', () => {
  it.each(ALL_SORTS)(
    '[B1] sort %s: pages 1 and 2 at 12 hold each of the 13 tours exactly once',
    (sort) => {
      const entries = seedEntries();

      const first = applyCatalogueQuery(
        entries,
        query({ sort: [sort] }),
        TODAY,
      );
      const second = applyCatalogueQuery(
        entries,
        query({ sort: [sort], page: 2 }),
        TODAY,
      );
      const ids = [...first.items, ...second.items].map((tour) => tour.id);

      expect(ids).toHaveLength(13);
      expect(new Set(ids).size).toBe(13);
    },
  );

  it('[B1] equal sort values are ordered by name, then id', () => {
    const entries = seedEntries().map((entry) => ({ ...entry, price: 20000 }));

    const result = applyCatalogueQuery(
      entries,
      query({ sort: ['price'] }),
      TODAY,
    );

    const names = result.items.map((tour) => tour.name);
    expect(names).toEqual([...names].sort());
  });

  it('[B1] two tours with the same name and price are ordered by id', () => {
    const base = byName(seedEntries(), 'Thar Desert Camel Safari');
    const entries = [
      { ...base, id: 'b-tour', price: 15000 },
      { ...base, id: 'a-tour', price: 15000 },
    ];

    const result = applyCatalogueQuery(
      entries,
      query({ sort: ['price'] }),
      TODAY,
    );

    expect(result.items.map((tour) => tour.id)).toEqual(['a-tour', 'b-tour']);
  });

  it('[B11] a page past the end is clamped to the last page on the page', () => {
    const result = applyCatalogueQuery(
      seedEntries(),
      query({ page: 99, clampPage: true }),
      TODAY,
    );

    expect(result.page).toBe(2);
    expect(result.items.map((tour) => tour.name)).toEqual([
      'Kedarkantha Winter Trek',
    ]);
  });

  it('[B11] a page past the end is an empty list with the real total on the API', () => {
    const result = applyCatalogueQuery(
      seedEntries(),
      query({ page: 99, clampPage: false }),
      TODAY,
    );

    expect(result.items).toEqual([]);
    expect(result.total).toBe(13);
    expect(result.page).toBe(99);
  });

  it('[B11] limit 100 holds all 13 tours on one page', () => {
    const result = applyCatalogueQuery(
      seedEntries(),
      query({ limit: 100 }),
      TODAY,
    );

    expect(result.items).toHaveLength(13);
    expect(result.totalPages).toBe(1);
  });

  it('[B1] does not reorder the entries it was given, which may be a cached value', () => {
    const entries = seedEntries();
    const before = entries.map((entry) => entry.id);

    applyCatalogueQuery(entries, query({ sort: ['price'] }), TODAY);

    expect(entries.map((entry) => entry.id)).toEqual(before);
  });
});

describe('applyCatalogueQuery: filters', () => {
  it('[S7] no filter returns every tour', () => {
    const result = applyCatalogueQuery(
      seedEntries(),
      query({ limit: 100 }),
      TODAY,
    );

    expect(result.total).toBe(13);
  });

  it('[S7] price >= 12999 includes the Rishikesh Ganga Rafting tour at exactly 12,999', () => {
    const result = applyCatalogueQuery(
      seedEntries(),
      query({
        limit: 100,
        filters: [{ field: 'price', op: 'gte', value: 12999 }],
      }),
      TODAY,
    );

    expect(result.items.map((tour) => tour.name)).toContain(
      'Rishikesh Ganga Rafting',
    );
  });

  it('[S7] price > 12999 excludes the Rishikesh Ganga Rafting tour at exactly 12,999', () => {
    const result = applyCatalogueQuery(
      seedEntries(),
      query({
        limit: 100,
        filters: [{ field: 'price', op: 'gt', value: 12999 }],
      }),
      TODAY,
    );

    expect(result.items.map((tour) => tour.name)).not.toContain(
      'Rishikesh Ganga Rafting',
    );
  });

  it('[S7] a filtered result keeps the requested sort, with name then id as the tie-breaks', () => {
    const result = applyCatalogueQuery(
      seedEntries(),
      query({
        sort: ['price'],
        limit: 100,
        difficulty: 'easy',
      }),
      TODAY,
    );

    const prices = result.items.map((tour) => tour.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(result.items.every((tour) => tour.difficulty === 'easy')).toBe(true);
  });

  it('[U10] the 3-4 day band holds the 3 and 4 day tours and not the 5 day tour', () => {
    const result = applyCatalogueQuery(
      seedEntries(),
      query({ limit: 100, lengthBand: [3, 4] }),
      TODAY,
    );
    const names = result.items.map((tour) => tour.name);

    expect(names).toContain('Thar Desert Camel Safari');
    expect(names).toContain('Ranthambore Tiger Safari');
    expect(names).not.toContain('Kerala Backwaters and Hills');
  });

  it('[U10] the 5-6 day band includes a 5 day tour and a 6 day tour', () => {
    const result = applyCatalogueQuery(
      seedEntries(),
      query({ limit: 100, lengthBand: [5, 6] }),
      TODAY,
    );
    const names = result.items.map((tour) => tour.name);

    expect(names).toContain('Kerala Backwaters and Hills');
    expect(names).toContain('Valley of Flowers Trek');
  });

  it('[U10] maxPrice 20000 includes a tour priced at exactly 20000', () => {
    const entries = seedEntries().map((entry) =>
      entry.name === 'Thar Desert Camel Safari'
        ? { ...entry, price: 20000 }
        : entry,
    );

    const result = applyCatalogueQuery(
      entries,
      query({ limit: 100, maxPrice: 20000 }),
      TODAY,
    );

    expect(result.items.map((tour) => tour.name)).toContain(
      'Thar Desert Camel Safari',
    );
  });

  it('[U10] maxPrice 20000 excludes a tour priced at 20001', () => {
    const entries = seedEntries().map((entry) =>
      entry.name === 'Thar Desert Camel Safari'
        ? { ...entry, price: 20001 }
        : entry,
    );

    const result = applyCatalogueQuery(
      entries,
      query({ limit: 100, maxPrice: 20000 }),
      TODAY,
    );

    expect(result.items.map((tour) => tour.name)).not.toContain(
      'Thar Desert Camel Safari',
    );
  });

  it('[U10] month 2027-01 includes a 1 January departure, and month 2026-12 does not', () => {
    const base = byName(seedEntries(), 'Thar Desert Camel Safari');
    const entries = [{ ...base, startDates: ['2027-01-01'] }];

    const january = applyCatalogueQuery(
      entries,
      query({ month: '2027-01' }),
      TODAY,
    );
    const december = applyCatalogueQuery(
      entries,
      query({ month: '2026-12' }),
      TODAY,
    );

    expect(january.total).toBe(1);
    expect(december.total).toBe(0);
  });

  it('[U10] a departure today is not bookable, so its month is not matched for that day', () => {
    const base = byName(seedEntries(), 'Thar Desert Camel Safari');
    const entries = [{ ...base, startDates: ['2026-11-08'] }];

    const result = applyCatalogueQuery(
      entries,
      query({ month: '2026-11' }),
      TODAY,
    );

    expect(result.total).toBe(0);
  });
});

describe('monthOptionsFrom and nextBookableDate', () => {
  it('[U10] the seed on 8 Nov 2026 gives Nov 2026 to Apr 2027, then Jun to Oct 2027, with no May 2027', () => {
    expect(monthOptionsFrom(seedEntries(), TODAY)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-06',
      '2027-07',
      '2027-08',
      '2027-09',
      '2027-10',
    ]);
  });

  it('[U10] a departure on today does not give its month as an option', () => {
    const base = byName(seedEntries(), 'Thar Desert Camel Safari');

    expect(
      monthOptionsFrom([{ ...base, startDates: ['2026-11-08'] }], TODAY),
    ).toEqual([]);
  });

  it('[D-03] nextBookableDate is the earliest departure after today, or null when none is left', () => {
    expect(
      nextBookableDate(['2026-11-08', '2026-11-21', '2026-12-05'], TODAY),
    ).toBe('2026-11-21');
    expect(nextBookableDate(['2026-11-08'], TODAY)).toBeNull();
  });
});

describe('statsFrom: one row per difficulty (F1)', () => {
  it('[F1] gives the rows for the difficulties present, in the order easy, medium, difficult', () => {
    expect(statsFrom(seedEntries()).map((row) => row.difficulty)).toEqual([
      'easy',
      'medium',
      'difficult',
    ]);
  });

  it('[F1] counts tours and ratings, rounds the averages, and gives the price bounds', () => {
    // avgRating for easy and difficult is exactly 4.65, which rounds half up to 4.7.
    expect(statsFrom(seedEntries())).toEqual([
      {
        difficulty: 'easy',
        numTours: 6,
        numRatings: 24,
        avgRating: 4.7,
        avgPrice: 27999,
        minPrice: 16999,
        maxPrice: 38999,
      },
      {
        difficulty: 'medium',
        numTours: 5,
        numRatings: 20,
        avgRating: 4.5,
        avgPrice: 19999,
        minPrice: 12999,
        maxPrice: 32999,
      },
      {
        difficulty: 'difficult',
        numTours: 2,
        numRatings: 8,
        avgRating: 4.7,
        avgPrice: 35499,
        minPrice: 27999,
        maxPrice: 42999,
      },
    ]);
  });

  it('[F1] leaves out a difficulty that has no tours', () => {
    const onlyEasy = seedEntries().filter(
      (entry) => entry.difficulty === 'easy',
    );

    expect(statsFrom(onlyEasy).map((row) => row.difficulty)).toEqual(['easy']);
  });

  it('[F1] an empty catalogue gives no rows', () => {
    expect(statsFrom([])).toEqual([]);
  });

  it('[F1] rounds an average at exactly .5 up, for both the rating and the price', () => {
    const base = byName(seedEntries(), 'Thar Desert Camel Safari');

    const rows = statsFrom([
      { ...base, ratingsAverage: 4.4, price: 1000 },
      { ...base, ratingsAverage: 4.5, price: 1001 },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ avgRating: 4.5, avgPrice: 1001 });
  });
});
