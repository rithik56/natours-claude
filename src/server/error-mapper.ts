import 'server-only';
import { errors } from 'jose';
import { messages } from '@/lib/messages';
import { isDbUnavailableError } from '@/server/db';
import { AppError, isAppError, type ErrorDetail } from '@/server/errors';
import { issuesToDetails, z } from '@/server/validation';

type DriverError = {
  name?: unknown;
  code?: unknown;
  type?: unknown;
  keyPattern?: unknown;
  path?: unknown;
  errors?: unknown;
};

// The original error rides along for the logs. It is not enumerable, so it can
// never be serialised into a response by accident (SEC-11).
function withCause(mapped: AppError, cause: unknown): AppError {
  Object.defineProperty(mapped, 'cause', {
    value: cause,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return mapped;
}

function firstKey(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  return Object.keys(value)[0];
}

/**
 * Turns anything thrown into an AppError with a safe message (B9). Driver and
 * Mongoose messages, key values, rejected values and stacks are never copied: a
 * caller sees only the code, the generic text and the field names.
 *
 * @param err - Whatever was thrown, including a non-Error value.
 * @returns The error itself when it already is an AppError, otherwise a mapped
 * one that keeps the original as `cause` for logging.
 */
export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (err instanceof z.ZodError) {
    return withCause(
      new AppError('VALIDATION_ERROR', undefined, issuesToDetails(err)),
      err,
    );
  }
  if (isDbUnavailableError(err)) {
    return withCause(new AppError('SERVICE_UNAVAILABLE'), err);
  }
  if (err instanceof errors.JWTExpired) {
    return withCause(new AppError('TOKEN_EXPIRED'), err);
  }
  if (err instanceof errors.JOSEError) {
    return withCause(new AppError('UNAUTHENTICATED'), err);
  }
  if (typeof err === 'object' && err !== null) {
    const driver = err as DriverError;
    if (driver.name === 'CastError') {
      const path = typeof driver.path === 'string' ? driver.path : '';
      const detail: ErrorDetail = {
        path,
        message: messages.validation.invalidId,
      };
      return withCause(
        new AppError('VALIDATION_ERROR', undefined, [detail]),
        err,
      );
    }
    if (driver.name === 'ValidationError' && driver.errors) {
      const details = Object.keys(driver.errors).map((path) => ({
        path,
        message: messages.validation.invalidValue,
      }));
      return withCause(
        new AppError('VALIDATION_ERROR', undefined, details),
        err,
      );
    }
    if (driver.code === 11000) {
      const path = firstKey(driver.keyPattern) ?? '';
      return withCause(
        new AppError('CONFLICT', undefined, [
          { path, message: messages.errors.CONFLICT },
        ]),
        err,
      );
    }
    if (driver.type === 'StripeSignatureVerificationError') {
      return withCause(new AppError('VALIDATION_ERROR'), err);
    }
  }
  return withCause(new AppError('INTERNAL'), err);
}
