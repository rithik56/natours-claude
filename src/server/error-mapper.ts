import 'server-only';
import { AppError } from '@/server/errors';

// Throwaway RED stub: every value maps to INTERNAL.
export function toAppError(err: unknown): AppError {
  void err;
  return new AppError('INTERNAL');
}
