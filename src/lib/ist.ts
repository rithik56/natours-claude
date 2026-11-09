/** A calendar day in India Standard Time, written YYYY-MM-DD. */
export type IstDay = string;

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

const istParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The IST calendar day an instant falls on, whatever zone the process runs in. */
export function toIstDay(date: Date): IstDay {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Cannot read the IST day of an invalid date');
  }
  const parts = Object.fromEntries(
    istParts.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The instant of 00:00 IST on the given day. Throws RangeError unless it is a real day. */
export function fromIstDay(day: IstDay): Date {
  const match = DAY_PATTERN.exec(day);
  if (!match) {
    throw new RangeError(`"${day}" is not a YYYY-MM-DD day`);
  }
  const [, year, month, dayOfMonth] = match;
  const instant = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(dayOfMonth)) -
      IST_OFFSET_MS,
  );
  if (toIstDay(instant) !== day) {
    throw new RangeError(`"${day}" is not a real calendar day`);
  }
  return instant;
}

/** Moves a day forwards or backwards. IST has no daylight saving, so a day is always 24 hours. */
export function addIstDays(day: IstDay, days: number): IstDay {
  return toIstDay(new Date(fromIstDay(day).getTime() + days * DAY_MS));
}

export function isIstMidnight(date: Date): boolean {
  return (((date.getTime() + IST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS === 0;
}

/** D-03: bookable while the departure's IST day is after today's IST day. */
export function isBookable(startDate: Date, now: Date): boolean {
  return toIstDay(startDate) > toIstDay(now);
}

/** D-04: upcoming until the trip's last IST day (start + duration - 1) has passed. */
export function tripStatus(
  startDate: Date,
  durationDays: number,
  now: Date,
): 'upcoming' | 'past' {
  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new RangeError('A trip lasts a whole number of days, at least 1');
  }
  const lastDay = addIstDays(toIstDay(startDate), durationDays - 1);
  return lastDay >= toIstDay(now) ? 'upcoming' : 'past';
}

/** The half-open range [start, end) covering an IST calendar month, given as YYYY-MM. */
export function istMonthBounds(month: string): { start: Date; end: Date } {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    throw new RangeError(`"${month}" is not a YYYY-MM month`);
  }
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  return {
    start: fromIstDay(`${month}-01`),
    end: fromIstDay(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`),
  };
}
