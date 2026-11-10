import { describe, expect, it } from 'vitest';
import { messages } from '@/lib/messages';
import {
  created,
  errorBody,
  errorResponse,
  list,
  noContent,
  ok,
} from '@/server/api/responses';
import { AppError } from '@/server/errors';

const requestId = '0b2f6f46-5a62-4a26-9c2b-61f8c0d7a111';

describe('success helpers', () => {
  it('[B9] ok answers 200 with status success and the data', async () => {
    const response = ok({ name: 'Dhanushkodi' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'success',
      data: { name: 'Dhanushkodi' },
    });
  });

  it('[B9] ok keeps the init headers', () => {
    const response = ok({}, { headers: { 'cache-control': 'no-store' } });

    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('[B9] created answers 201', async () => {
    const response = created({ id: 'a' });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      status: 'success',
      data: { id: 'a' },
    });
  });

  it('[B9] list adds the page, limit and total as meta', async () => {
    const response = list([1, 2], { page: 2, limit: 2, total: 5 });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'success',
      data: [1, 2],
      meta: { page: 2, limit: 2, total: 5 },
    });
  });

  it('[B9] noContent is 204 with an empty body', async () => {
    const response = noContent();

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});

describe('errorBody and errorResponse', () => {
  it('[B9] a 4xx error is a fail with the request id and no details key', () => {
    const body = errorBody(new AppError('NOT_FOUND'), requestId);

    expect(body).toEqual({
      status: 'fail',
      error: {
        code: 'NOT_FOUND',
        message: messages.errors.NOT_FOUND,
        requestId,
      },
    });
    expect('details' in body.error).toBe(false);
  });

  it('[B9] RATE_LIMITED is a fail, INTERNAL and SERVICE_UNAVAILABLE are errors', () => {
    expect(errorBody(new AppError('RATE_LIMITED'), requestId).status).toBe(
      'fail',
    );
    expect(errorBody(new AppError('INTERNAL'), requestId).status).toBe('error');
    expect(
      errorBody(new AppError('SERVICE_UNAVAILABLE'), requestId).status,
    ).toBe('error');
  });

  it('[B9] details are included when the error has them', () => {
    const body = errorBody(
      new AppError('VALIDATION_ERROR', undefined, [
        { path: 'email', message: messages.validation.invalidEmail },
      ]),
      requestId,
    );

    expect(body.error.details).toEqual([
      { path: 'email', message: messages.validation.invalidEmail },
    ]);
  });

  it('[B9] errorResponse carries the error status and the body, with no stack or cause', async () => {
    const error = new AppError('CONFLICT');
    error.cause = new Error('driver detail');

    const response = errorResponse(error, requestId);
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toEqual(errorBody(error, requestId));
    expect(text).not.toMatch(/stack|cause|driver detail| at /);
  });
});
