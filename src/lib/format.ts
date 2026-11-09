import { fromIstDay } from './ist';

const DAY_STRING = /^\d{4}-\d{2}-\d{2}$/;

const priceFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const distanceFormat = new Intl.NumberFormat('en-IN', {
  style: 'unit',
  unit: 'kilometer',
  maximumFractionDigits: 0,
});

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

function assertWholeRupees(rupees: number): void {
  if (!Number.isSafeInteger(rupees) || rupees < 1) {
    throw new RangeError('A price is a whole number of rupees, at least 1');
  }
}

/** B20: whole rupees with Indian digit grouping, for example ₹1,24,999. */
export function formatPrice(rupees: number): string {
  assertWholeRupees(rupees);
  return priceFormat.format(rupees);
}

/** B20: whole rupees to integer paise. A fractional amount throws instead of rounding. */
export function rupeesToPaise(rupees: number): number {
  assertWholeRupees(rupees);
  return rupees * 100;
}

/**
 * B19: a calendar date in India Standard Time, such as "5 Dec 2026".
 * A YYYY-MM-DD string is an IST day; any other string is an ISO instant.
 */
export function formatDate(value: Date | string): string {
  const date =
    typeof value === 'string'
      ? DAY_STRING.test(value)
        ? fromIstDay(value)
        : new Date(value)
      : value;
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Cannot format an invalid date');
  }
  const parts = Object.fromEntries(
    dateFormat.formatToParts(date).map((part) => [part.type, part.value]),
  );
  // ICU writes September as "Sept"; the product style is three letters (D-01).
  const month = parts.month === 'Sept' ? 'Sep' : parts.month;
  return `${parts.day} ${month} ${parts.year}`;
}

/** Distances are in kilometres, for example "1,234 km". */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) {
    throw new RangeError(
      'A distance is a finite number of kilometres, 0 or more',
    );
  }
  return distanceFormat.format(km);
}
