import 'server-only';
import { getConfig } from './config';

const HAS_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// APP_NOW values without an offset are India Standard Time, not the server's zone.
function parsePinned(value: string): Date {
  if (DATE_ONLY.test(value)) return new Date(`${value}T00:00:00+05:30`);
  if (HAS_OFFSET.test(value)) return new Date(value);
  return new Date(`${value}+05:30`);
}

/** The one clock all date logic reads. APP_NOW pins it in development, test and ci. */
export function now(): Date {
  const pinned = getConfig().APP_NOW;
  return pinned === undefined ? new Date() : parsePinned(pinned);
}
