import { describe, expect, it } from 'vitest';
import {
  addYears,
  rollStartDate,
  rollStartDates,
} from '../../scripts/seed/dates.ts';
import { seedTourRecords } from '../../scripts/seed/load.ts';

// The pure date roll (ADR 0023, ADR 0030). Every fixture is a real seed record, never invented text.
const tours = seedTourRecords();

function tourBySlug(slug: string) {
  const tour = tours.find((entry) => entry.slug === slug);
  if (!tour) throw new Error(`no seed tour ${slug}`);
  return tour;
}

describe('addYears', () => {
  it('[D10] adds whole years to a YYYY-MM-DD day', () => {
    expect(addYears('2026-11-21', 1)).toBe('2027-11-21');
  });

  it('[D10] a 29 February that lands in a non-leap year becomes 28 February', () => {
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28');
  });

  it('[D10] a 29 February that lands in a leap year stays 29 February', () => {
    expect(addYears('2028-02-29', 4)).toBe('2032-02-29');
  });

  it('[D10] refuses a day that is not a real calendar day', () => {
    expect(() => addYears('2026-02-30', 1)).toThrow(RangeError);
  });
});

describe('rollStartDates', () => {
  it('[D10] with today 2026-11-08 no seed start date moves, and the earliest is Meghalaya on 21 Nov 2026', () => {
    const everyDate = tours.flatMap((tour) => tour.startDates);
    const rolled = tours.flatMap((tour) =>
      rollStartDates(tour.startDates, '2026-11-08', tour.slug),
    );
    expect([...rolled].sort()).toEqual([...everyDate].sort());
    expect([...rolled].sort()[0]).toBe('2026-11-21');
    expect(tourBySlug('meghalaya-living-root-bridges').startDates[0]).toBe(
      '2026-11-21',
    );
  });

  it('[D10] with today 2026-11-21 only Meghalaya 21 Nov 2026 moves, to 2027-11-21, and its later dates stay', () => {
    const meghalaya = tourBySlug('meghalaya-living-root-bridges');
    expect(
      rollStartDates(meghalaya.startDates, '2026-11-21', meghalaya.slug),
    ).toEqual(['2027-01-14', '2027-03-11', '2027-11-21']);
  });

  it('[D10] a departure whose IST day equals today counts as passed and moves forward one year', () => {
    expect(rollStartDate('2026-11-21', '2026-11-21', false)).toBe('2027-11-21');
  });

  it('[D10] a departure one day after today stays where it is', () => {
    expect(rollStartDate('2026-11-22', '2026-11-21', false)).toBe('2026-11-22');
  });

  it('[D10] with today 2027-06-01 and 2027-12-01 every date is after today and each tour is ascending', () => {
    for (const today of ['2027-06-01', '2027-12-01']) {
      for (const tour of tours) {
        const rolled = rollStartDates(tour.startDates, today, tour.slug);
        for (const day of rolled) expect(day > today).toBe(true);
        expect(rolled).toEqual([...rolled].sort());
      }
    }
  });

  it('[D10] with today 2027-12-01 the Golden Triangle 28 Nov 2026 departure becomes 27 Nov 2028, because day 4 would be a Friday', () => {
    const goldenTriangle = tourBySlug('golden-triangle-heritage');
    const rolled = rollStartDates(
      goldenTriangle.startDates,
      '2027-12-01',
      goldenTriangle.slug,
    );
    expect(rolled).toContain('2028-11-27');
    expect(rolled).not.toContain('2028-11-28');
  });

  it('[D10] the Friday rule does not move a departure for any tour other than the Golden Triangle', () => {
    const rolled = rollStartDate('2028-11-28', '2027-12-01', false);
    expect(rolled).toBe('2028-11-28');
  });

  it('[D10] a Golden Triangle departure whose day 4 is a Friday moves one day earlier', () => {
    expect(rollStartDate('2028-11-28', '2027-12-01', true)).toBe('2028-11-27');
  });
});
