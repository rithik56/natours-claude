import 'server-only';

export type BookingDto = Record<string, unknown>;

export function toBooking(booking: object): BookingDto {
  return { ...booking };
}
