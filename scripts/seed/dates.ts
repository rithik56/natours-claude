import { addIstDays, fromIstDay, type IstDay } from '@/lib/ist';

// ADR 0023 and ADR 0030: the seed rolls forward only the start dates that have passed. These
// functions work on YYYY-MM-DD strings, so a date stays a calendar day in India Standard Time (B19).

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const FRIDAY = 5;

/** The slug whose Golden Triangle departures must never put day 4 on a Friday (seed/README.md). */
export const GOLDEN_TRIANGLE_SLUG = 'golden-triangle-heritage';

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** The weekday of a YYYY-MM-DD day, 0 for Sunday to 6 for Saturday. */
export function weekdayOf(day: IstDay): number {
  fromIstDay(day);
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

/**
 * Adds whole years to a YYYY-MM-DD day. A 29 February that lands in a non-leap year becomes
 * 28 February (ADR 0030). Throws RangeError unless the day is a real calendar day.
 */
export function addYears(day: IstDay, years: number): IstDay {
  const match = DAY_PATTERN.exec(day);
  fromIstDay(day);
  const [, yearText = '', month = '', dayOfMonth = ''] = match ?? [];
  const year = Number(yearText) + years;
  const monthDay =
    month === '02' && dayOfMonth === '29' && !isLeapYear(year)
      ? '02-28'
      : `${month}-${dayOfMonth}`;
  return `${String(year).padStart(4, '0')}-${monthDay}`;
}

/**
 * Rolls one start date forward (ADR 0023, ADR 0030). A date is passed when it is not after today,
 * so it moves by whole years until it is after today. Then, for a Golden Triangle departure whose
 * day 4 (start plus 3 days) falls on a Friday, it moves one day earlier and the roll is checked again.
 */
export function rollStartDate(
  day: IstDay,
  today: IstDay,
  isGoldenTriangle: boolean,
): IstDay {
  let rolled = day;
  for (;;) {
    while (rolled <= today) rolled = addYears(rolled, 1);
    if (!isGoldenTriangle || weekdayOf(addIstDays(rolled, 3)) !== FRIDAY) {
      return rolled;
    }
    rolled = addIstDays(rolled, -1);
  }
}

/** Rolls every start date of one tour and returns them in ascending order (ADR 0030). */
export function rollStartDates(
  days: readonly IstDay[],
  today: IstDay,
  slug: string,
): IstDay[] {
  const isGoldenTriangle = slug === GOLDEN_TRIANGLE_SLUG;
  return days
    .map((day) => rollStartDate(day, today, isGoldenTriangle))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
