import 'server-only';
import { messages } from '@/lib/messages';

// Skeleton for the RED commit: the code list is data, the behaviour is not written yet.
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'TOKEN_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'RATE_LIMITED',
  'INTERNAL',
  'SERVICE_UNAVAILABLE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_STATUS = {} as Record<ErrorCode, number>;

export type ErrorDetail = { path: string; message: string };

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number = 0;
  readonly details: ErrorDetail[] | undefined;

  constructor(
    code: ErrorCode,
    message: string = messages.errors[code],
    details?: ErrorDetail[],
  ) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value === undefined;
}
