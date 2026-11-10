import { describe, expect, it } from 'vitest';
import {
  addIstDays,
  fromIstDay,
  isBookable,
  isIstMidnight,
  istMonthBounds,
  toIstDay,
  tripStatus,
} from '@/lib/ist';

// Seed: Meghalaya Living Root Bridges departs 21 Nov 2026 and lasts 5 days.
const meghalayaStart = fromIstDay('2026-11-21');
const meghalayaDuration = 5;

function isoOf(date: Date): string {
  return date.toISOString();
}

describe('IST calendar days', () => {
  it('[B19] fromIstDay gives 00:00 IST, which is 18:30 UTC the day before', () => {
    expect(isoOf(fromIstDay('2027-03-12'))).toBe('2027-03-11T18:30:00.000Z');
  });

  it('[B19] toIstDay reads the IST day, not the process zone', () => {
    expect(toIstDay(new Date('2027-03-11T18:30:00.000Z'))).toBe('2027-03-12');
    expect(toIstDay(new Date('2026-12-31T18:29:59.000Z'))).toBe('2026-12-31');
    expect(toIstDay(new Date('2026-12-31T18:30:00.000Z'))).toBe('2027-01-01');
  });

  it('[B19] toIstDay round-trips fromIstDay', () => {
    const days = ['2026-11-21', '2027-01-16', '2027-09-04', '2028-02-29'];
    expect(days.map((day) => toIstDay(fromIstDay(day))).join(',')).toBe(
      days.join(','),
    );
  });

  it('[B19] fromIstDay throws RangeError on impossible or malformed days', () => {
    const bad = [
      '2027-02-30',
      '2027-02-29',
      '2027-13-01',
      '12-03-2027',
      '2027-2-3',
      '',
    ];
    const outcomes = bad.map((day) => {
      try {
        fromIstDay(day);
        return 'accepted';
      } catch (error) {
        return error instanceof RangeError ? 'RangeError' : 'other';
      }
    });
    expect(outcomes.join(',')).toBe(bad.map(() => 'RangeError').join(','));
  });

  it('[B19] toIstDay throws RangeError on an invalid date', () => {
    expect(() => toIstDay(new Date('not a date'))).toThrow(RangeError);
  });

  it('[B19] addIstDays moves across month and year ends in either direction', () => {
    expect(addIstDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addIstDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(addIstDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addIstDays('2027-07-10', 0)).toBe('2027-07-10');
  });

  it('[B19] isIstMidnight is true only for 00:00 IST', () => {
    expect(isIstMidnight(fromIstDay('2027-07-10'))).toBe(true);
    expect(isIstMidnight(new Date('2027-07-10T00:00:00Z'))).toBe(false);
    expect(isIstMidnight(new Date('2027-07-09T18:30:01Z'))).toBe(false);
  });
});

describe('isBookable (D-03)', () => {
  it('[B19] is true until the last second of the day before departure', () => {
    const now = new Date('2026-11-20T23:59:59+05:30');
    expect(isBookable(meghalayaStart, now)).toBe(true);
  });

  it('[B19] is false from 00:00 IST on the departure day', () => {
    const now = new Date('2026-11-21T00:00:00+05:30');
    expect(isBookable(meghalayaStart, now)).toBe(false);
  });

  it('[B19] is false after the departure day', () => {
    expect(
      isBookable(meghalayaStart, new Date('2026-11-22T10:00:00+05:30')),
    ).toBe(false);
  });

  it('[B19] compares IST days, so a UTC evening that is already tomorrow in IST counts as tomorrow', () => {
    const now = new Date('2026-11-20T18:30:00Z');
    expect(isBookable(meghalayaStart, now)).toBe(false);
  });
});

describe('tripStatus (D-04)', () => {
  it('[B19] is upcoming on the last IST day of the trip', () => {
    const lastDayEnd = new Date('2026-11-25T23:59:59+05:30');
    expect(tripStatus(meghalayaStart, meghalayaDuration, lastDayEnd)).toBe(
      'upcoming',
    );
  });

  it('[B19] is past at 00:00 IST on the day after the last day', () => {
    const next = new Date('2026-11-26T00:00:00+05:30');
    expect(tripStatus(meghalayaStart, meghalayaDuration, next)).toBe('past');
  });

  it('[B19] is upcoming before departure and on the first day', () => {
    const before = new Date('2026-10-01T09:00:00+05:30');
    const first = new Date('2026-11-21T09:00:00+05:30');
    expect(tripStatus(meghalayaStart, meghalayaDuration, before)).toBe(
      'upcoming',
    );
    expect(tripStatus(meghalayaStart, meghalayaDuration, first)).toBe(
      'upcoming',
    );
  });

  it('[B19] a one-day trip is past the next IST day', () => {
    expect(
      tripStatus(meghalayaStart, 1, new Date('2026-11-21T23:59:59+05:30')),
    ).toBe('upcoming');
    expect(
      tripStatus(meghalayaStart, 1, new Date('2026-11-22T00:00:00+05:30')),
    ).toBe('past');
  });

  it('[B19] throws RangeError for a duration that is not a whole number of days', () => {
    expect(() => tripStatus(meghalayaStart, 0, new Date())).toThrow(RangeError);
    expect(() => tripStatus(meghalayaStart, 2.5, new Date())).toThrow(
      RangeError,
    );
  });
});

describe('istMonthBounds (QA-10)', () => {
  it('[B19] is half-open from the first IST day to the first of the next month', () => {
    const { start, end } = istMonthBounds('2027-01');
    expect(isoOf(start)).toBe('2026-12-31T18:30:00.000Z');
    expect(isoOf(end)).toBe('2027-01-31T18:30:00.000Z');
  });

  it('[B19] rolls December into January of the next year', () => {
    const { start, end } = istMonthBounds('2027-12');
    expect(toIstDay(start)).toBe('2027-12-01');
    expect(toIstDay(end)).toBe('2028-01-01');
  });

  it('[B19] throws RangeError on a malformed month', () => {
    expect(() => istMonthBounds('2027-13')).toThrow(RangeError);
    expect(() => istMonthBounds('2027-1')).toThrow(RangeError);
  });
});
