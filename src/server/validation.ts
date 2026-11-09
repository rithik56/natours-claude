import 'server-only';
import { z } from 'zod';
import type { ErrorDetail } from './errors';

// Skeleton for the RED commit: no global error map yet, and the converters return nothing.
export { z };

export function issuesToDetails(error: z.ZodError): ErrorDetail[] {
  void error;
  return [];
}

export function issuesToFieldErrors(error: z.ZodError): Record<string, string> {
  void error;
  return {};
}
