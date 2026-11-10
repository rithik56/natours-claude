import 'server-only';
import type { AppError, ErrorCode, ErrorDetail } from '@/server/errors';

/** The plan.md 4.1 envelope for a failure. `details` is present only for field errors. */
export type ErrorBody = {
  status: 'fail' | 'error';
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    requestId: string;
  };
};

export type ListMeta = { page: number; limit: number; total: number };

/** 200 with `{ status: 'success', data }`. */
export function ok(data: unknown, init?: ResponseInit): Response {
  return Response.json({ status: 'success', data }, { status: 200, ...init });
}

/** 201 with `{ status: 'success', data }`. */
export function created(data: unknown): Response {
  return Response.json({ status: 'success', data }, { status: 201 });
}

/** 200 with the page of `data` and its `meta`. */
export function list(data: unknown[], meta: ListMeta): Response {
  return Response.json({ status: 'success', data, meta });
}

/** 204 with an empty body. */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * The body for a failure: `fail` for the caller's mistakes below 500, `error`
 * for ours. It never carries a stack or a cause.
 */
export function errorBody(error: AppError, requestId: string): ErrorBody {
  const body: ErrorBody = {
    status: error.status < 500 ? 'fail' : 'error',
    error: { code: error.code, message: error.message, requestId },
  };
  if (error.details !== undefined) body.error.details = error.details;
  return body;
}

/** The failure response, with the error's own status. */
export function errorResponse(
  error: AppError,
  requestId: string,
  headers?: HeadersInit,
): Response {
  return Response.json(errorBody(error, requestId), {
    status: error.status,
    headers,
  });
}
