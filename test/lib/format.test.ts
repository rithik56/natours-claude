import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDistance,
  formatPrice,
  rupeesToPaise,
} from '@/lib/format';
import { fromIstDay } from '@/lib/ist';

function outcome(run: () => unknown): string {
  try {
    run();
    return 'returned';
  } catch (error) {
    return error instanceof RangeError ? 'RangeError' : 'other';
  }
}

describe('test environment', () => {
  it('[B19] runs with TZ=UTC so a server in UTC is what is tested', () => {
    expect(process.env.TZ).toBe('UTC');
  });
});

describe('formatPrice', () => {
  it('[B20] groups the Indian way: lakhs after the first three digits', () => {
    expect(formatPrice(124999)).toBe('₹1,24,999');
    expect(formatPrice(24999)).toBe('₹24,999');
  });

  it('[B20] gives the boundaries 1, 99,999 and 1,00,000', () => {
    expect(formatPrice(1)).toBe('₹1');
    expect(formatPrice(99999)).toBe('₹99,999');
    expect(formatPrice(100000)).toBe('₹1,00,000');
  });

  it('[B20] formats the seed tour prices without decimals', () => {
    expect(formatPrice(42999)).toBe('₹42,999');
    expect(formatPrice(12999)).toBe('₹12,999');
  });

  it('[B20] throws RangeError for zero, negative, fractional and non-finite amounts', () => {
    const bad = [0, -1, 18999.5, Number.NaN, Number.POSITIVE_INFINITY];
    expect(
      bad.map((rupees) => outcome(() => formatPrice(rupees))).join(','),
    ).toBe(bad.map(() => 'RangeError').join(','));
  });
});

describe('rupeesToPaise', () => {
  it('[B20] multiplies whole rupees by 100 into an integer', () => {
    expect(rupeesToPaise(18999)).toBe(1899900);
    expect(Number.isInteger(rupeesToPaise(27999))).toBe(true);
  });

  it('[B20] throws RangeError for a fractional rupee amount instead of rounding', () => {
    expect(outcome(() => rupeesToPaise(18999.5))).toBe('RangeError');
    expect(outcome(() => rupeesToPaise(0))).toBe('RangeError');
  });
});

describe('formatDate', () => {
  it('[B19] shows the IST day for an instant that is the next day in IST', () => {
    expect(formatDate(fromIstDay('2027-01-01'))).toBe('1 Jan 2027');
    expect(formatDate(new Date('2026-12-31T18:30:00Z'))).toBe('1 Jan 2027');
  });

  it('[B19] reads a YYYY-MM-DD string as an IST day', () => {
    expect(formatDate('2027-01-16')).toBe('16 Jan 2027');
    expect(formatDate('2027-01-01')).toBe('1 Jan 2027');
  });

  it('[B19] reads any other string as an ISO instant', () => {
    expect(formatDate('2026-12-31T18:30:00.000Z')).toBe('1 Jan 2027');
  });

  it('[B19] writes September as Sep, never Sept (D-01)', () => {
    expect(formatDate('2027-09-04')).toBe('4 Sep 2027');
    expect(formatDate('2027-09-18')).toBe('18 Sep 2027');
  });

  it('[B19] writes every month with three letters and always shows the year (D-01, D-02)', () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      formatDate(`2027-${String(i + 1).padStart(2, '0')}-05`),
    );
    const shapes = months.map((text) =>
      /^5 [A-Z][a-z]{2} 2027$/.test(text) ? 'ok' : text,
    );
    expect(shapes.join(',')).toBe(months.map(() => 'ok').join(','));
  });

  it('[B19] throws RangeError for an invalid date or an impossible day', () => {
    const run = [
      () => formatDate(new Date('not a date')),
      () => formatDate('2027-02-30'),
      () => formatDate('not a date'),
    ];
    expect(run.map((fn) => outcome(fn)).join(',')).toBe(
      'RangeError,RangeError,RangeError',
    );
  });
});

describe('formatDistance', () => {
  it('formats kilometres with Indian grouping', () => {
    expect(formatDistance(16)).toBe('16 km');
    expect(formatDistance(1234)).toBe('1,234 km');
  });

  it('throws RangeError for a negative or non-finite distance', () => {
    expect(outcome(() => formatDistance(-1))).toBe('RangeError');
    expect(outcome(() => formatDistance(Number.NaN))).toBe('RangeError');
  });
});
