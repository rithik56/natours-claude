import { SignJWT, errors, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';
import { messages } from '@/lib/messages';
import { StripeSignatureError } from '@/server/adapters/stripe';
import { AppError } from '@/server/errors';
import { toAppError } from '@/server/error-mapper';
import { User } from '@/server/modules/users/model';
import { z } from '@/server/validation';
import { TEST_PASSWORD, createUser } from '../helpers/factories';
import { useTestDatabase } from '../helpers/db';

const secret = new TextEncoder().encode('error-mapper-secret-0123456789abcdef');

/** Everything a response or a log reader could see of the mapped error, except `cause`. */
function visible(error: AppError): string {
  return JSON.stringify({
    code: error.code,
    status: error.status,
    message: error.message,
    details: error.details,
    own: error,
  });
}

async function expiredTokenError(): Promise<unknown> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('someone')
    .setIssuedAt(1_700_000_000)
    .setExpirationTime(1_700_000_100)
    .sign(secret);
  return jwtVerify(token, secret).catch((error: unknown) => error);
}

async function badSignatureError(): Promise<unknown> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('someone')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('another-secret-0123456789abcdef-xyz'));
  return jwtVerify(token, secret).catch((error: unknown) => error);
}

describe('toAppError', () => {
  useTestDatabase();

  it('[B9] returns an AppError unchanged', () => {
    const original = new AppError('NOT_FOUND', 'Tour not found.');

    const mapped = toAppError(original);

    expect(mapped === original).toBe(true);
  });

  it('[B9] maps a ZodError to VALIDATION_ERROR with a detail per issue and no English from Zod', () => {
    const parsed = z
      .object({ email: z.email(), age: z.number() })
      .safeParse({ email: 'nope' });
    if (parsed.success) throw new Error('the schema should have failed');

    const mapped = toAppError(parsed.error);

    expect(mapped.code).toBe('VALIDATION_ERROR');
    expect(mapped.status).toBe(400);
    expect(mapped.details).toEqual([
      { path: 'email', message: messages.validation.invalidEmail },
      { path: 'age', message: messages.validation.required },
    ]);
    expect(visible(mapped)).not.toMatch(/Invalid input|expected/i);
  });

  it('[B9] maps a real Mongoose CastError to VALIDATION_ERROR naming the path and not the value', async () => {
    const failure = await User.findById('not-an-id').catch(
      (error: unknown) => error,
    );
    expect((failure as Error).name).toBe('CastError');

    const mapped = toAppError(failure);

    expect(mapped.code).toBe('VALIDATION_ERROR');
    expect(mapped.details).toEqual([
      { path: '_id', message: messages.validation.invalidId },
    ]);
    expect(visible(mapped)).not.toContain('not-an-id');
  });

  it('[B9] maps a real duplicate-key error to CONFLICT naming the field and not the value', async () => {
    const { user } = await createUser();
    const failure = await User.create({
      name: user.name,
      email: user.email,
      password: TEST_PASSWORD,
    }).catch((error: unknown) => error);
    expect((failure as { code?: number }).code).toBe(11000);

    const mapped = toAppError(failure);

    expect(mapped.code).toBe('CONFLICT');
    expect(mapped.status).toBe(409);
    expect(mapped.details).toEqual([
      { path: 'email', message: messages.errors.CONFLICT },
    ]);
    expect(visible(mapped)).not.toContain(user.email);
    expect(visible(mapped)).not.toMatch(/E11000|dup key|index/i);
  });

  it('[B9] maps a real Mongoose ValidationError to VALIDATION_ERROR with no rejected value', async () => {
    const failure = await User.create({
      name: 'Aarav Mehta',
      email: 'rejected-value-not-an-email',
      password: 'short',
    }).catch((error: unknown) => error);
    expect((failure as Error).name).toBe('ValidationError');

    const mapped = toAppError(failure);

    expect(mapped.code).toBe('VALIDATION_ERROR');
    const paths = (mapped.details ?? []).map((detail) => detail.path).sort();
    expect(paths).toEqual(['email', 'password']);
    expect(visible(mapped)).not.toContain('rejected-value-not-an-email');
    expect(visible(mapped)).not.toContain('short');
  });

  it('[B9] maps jose JWTExpired to TOKEN_EXPIRED and other JOSE errors to UNAUTHENTICATED', async () => {
    const expired = await expiredTokenError();
    const forged = await badSignatureError();
    expect(expired instanceof errors.JWTExpired).toBe(true);
    expect(forged instanceof errors.JOSEError).toBe(true);

    const mappedExpired = toAppError(expired);
    const mappedForged = toAppError(forged);

    expect(mappedExpired.code).toBe('TOKEN_EXPIRED');
    expect(mappedExpired.status).toBe(401);
    expect(mappedForged.code).toBe('UNAUTHENTICATED');
    expect(mappedForged.status).toBe(401);
  });

  it('[B9] maps the Stripe signature error to VALIDATION_ERROR 400', () => {
    const mapped = toAppError(new StripeSignatureError());

    expect(mapped.code).toBe('VALIDATION_ERROR');
    expect(mapped.status).toBe(400);
  });

  it('[B9] maps an unreachable database to SERVICE_UNAVAILABLE 503', () => {
    const selection = new Error('connect ECONNREFUSED 127.0.0.1:27017');
    selection.name = 'MongooseServerSelectionError';

    const fromName = toAppError(selection);
    const fromApp = toAppError(new AppError('SERVICE_UNAVAILABLE'));

    expect(fromName.code).toBe('SERVICE_UNAVAILABLE');
    expect(fromName.status).toBe(503);
    expect(visible(fromName)).not.toContain('127.0.0.1');
    expect(fromApp.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('[B9] maps an unknown Error, a string and undefined to a generic INTERNAL', () => {
    const secretFailure = new Error('connect mongodb://admin:hunter2@db:27017');

    for (const thrown of [secretFailure, 'x', undefined, null, 42, {}]) {
      const mapped = toAppError(thrown);

      expect(mapped.code).toBe('INTERNAL');
      expect(mapped.status).toBe(500);
      expect(mapped.message).toBe(messages.errors.INTERNAL);
      expect(mapped.details).toBeUndefined();
    }
    expect(visible(toAppError(secretFailure))).not.toContain('hunter2');
  });

  it('[B9] keeps the original error as the cause for the logs, outside what serialises', () => {
    const original = new Error('boom');

    const mapped = toAppError(original);

    expect(mapped.cause === original).toBe(true);
    expect(JSON.stringify(mapped)).not.toContain('boom');
  });

  it('[B9] reads an AppError by its own code before inspecting driver fields', () => {
    const odd = new AppError('FORBIDDEN');
    Object.assign(odd, { code: 'FORBIDDEN', name: 'CastError' });

    const mapped = toAppError(odd);

    expect(mapped.code).toBe('FORBIDDEN');
  });
});
