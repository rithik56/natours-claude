// Skeleton for the RED commit: every helper returns a neutral wrong value.
export type IstDay = string;

export function toIstDay(date: Date): IstDay {
  void date;
  return '';
}

export function fromIstDay(day: IstDay): Date {
  void day;
  return new Date(0);
}

export function addIstDays(day: IstDay, days: number): IstDay {
  void days;
  return day;
}

export function isIstMidnight(date: Date): boolean {
  void date;
  return false;
}

export function isBookable(startDate: Date, now: Date): boolean {
  void startDate;
  void now;
  return false;
}

export function tripStatus(
  startDate: Date,
  durationDays: number,
  now: Date,
): 'upcoming' | 'past' {
  void startDate;
  void durationDays;
  void now;
  return 'past';
}

export function istMonthBounds(month: string): { start: Date; end: Date } {
  void month;
  return { start: new Date(0), end: new Date(0) };
}
