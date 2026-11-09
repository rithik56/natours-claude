import { describe, expect, it } from 'vitest';
import { messages } from '@/lib/messages';
import {
  AppError,
  ERROR_CODES,
  ERROR_STATUS,
  isAppError,
  type ErrorCode,
} from '@/server/errors';

// plan.md 4.2, joined into one line so a failing assertion prints on a single line.
const expectedStatuses = [
  'VALIDATION_ERROR:400',
  'UNAUTHENTICATED:401',
  'INVALID_CREDENTIALS:401',
  'TOKEN_EXPIRED:401',
  'FORBIDDEN:403',
  'NOT_FOUND:404',
  'CONFLICT:409',
  'PAYLOAD_TOO_LARGE:413',
  'UNSUPPORTED_MEDIA_TYPE:415',
  'RATE_LIMITED:429',
  'INTERNAL:500',
  'SERVICE_UNAVAILABLE:503',
].join(',');

describe('error codes', () => {
  it('[B9] maps each code to the status in plan.md 4.2 and nothing else', () => {
    const actual = Object.entries(ERROR_STATUS)
      .map(([code, status]) => `${code}:${status}`)
      .join(',');
    expect(actual).toBe(expectedStatuses);
  });

  it('[B9] lists the same codes in ERROR_CODES as in the status map', () => {
    expect(ERROR_CODES.join(',')).toBe(Object.keys(ERROR_STATUS).join(','));
  });

  it('[B9] writes every code in UPPER_SNAKE (Q3)', () => {
    const misnamed = ERROR_CODES.filter(
      (code) => !/^[A-Z][A-Z0-9_]*$/.test(code),
    );
    expect(misnamed.join(',')).toBe('');
  });
});

describe('AppError', () => {
  it('[B9] carries the status, the default message and the details of its code', () => {
    const details = [{ path: 'email', message: messages.errors.CONFLICT }];
    const error = new AppError('CONFLICT', undefined, details);
    expect(error.status).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.message).toBe(messages.errors.CONFLICT);
    expect(error.name).toBe('AppError');
    expect(JSON.stringify(error.details)).toBe(JSON.stringify(details));
  });

  it('[B9] uses the message it is given instead of the default', () => {
    const error = new AppError('NOT_FOUND', 'No tour has that slug.');
    expect(error.message).toBe('No tour has that slug.');
    expect(error.status).toBe(404);
  });

  it('[B9] has no details unless it is given some', () => {
    expect(new AppError('INTERNAL').details).toBeUndefined();
  });

  it('[B9] gives every code the status from the map', () => {
    const mismatched = ERROR_CODES.filter(
      (code: ErrorCode) => new AppError(code).status !== ERROR_STATUS[code],
    );
    expect(mismatched.join(',')).toBe('');
  });

  it('[B9] isAppError tells it apart from a plain Error and from other values', () => {
    expect(isAppError(new AppError('FORBIDDEN'))).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError({ code: 'FORBIDDEN', status: 403 })).toBe(false);
  });

  it('[B9] is an Error, so it can be thrown and caught', () => {
    expect(() => {
      throw new AppError('UNAUTHENTICATED');
    }).toThrow(messages.errors.UNAUTHENTICATED);
  });
});

describe('messages voice (DES-12)', () => {
  const sentences = [
    ...Object.values(messages.errors),
    ...Object.values(messages.validation).map((value) =>
      typeof value === 'function' ? value(8) : value,
    ),
  ];

  it('[B9] has a message for every error code', () => {
    const missing = ERROR_CODES.filter((code) => !messages.errors[code]);
    expect(missing.join(',')).toBe('');
  });

  it('[B9] ends every message as a sentence, with no apology or exclamation', () => {
    const offending = sentences.filter(
      (text) => !text.endsWith('.') || /sorry|oops|apolog|!/i.test(text),
    );
    expect(offending.join(' | ')).toBe('');
  });

  it('[B9] uses British spelling', () => {
    const american = sentences.filter((text) =>
      /\b(?:recogniz|color|canceled|center|behavior)/i.test(text),
    );
    expect(american.join(' | ')).toBe('');
  });
});
