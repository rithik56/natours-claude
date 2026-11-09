import 'server-only';
import type { AppError, ErrorCode, ErrorDetail } from '@/server/errors';

// Throwaway RED stub: every helper answers an empty 200.
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

export function ok(data: unknown, init?: ResponseInit): Response {
  void data;
  return new Response(null, init);
}

export function created(data: unknown): Response {
  void data;
  return new Response(null);
}

export function list(data: unknown[], meta: ListMeta): Response {
  void data;
  void meta;
  return new Response(null);
}

export function noContent(): Response {
  return new Response(null);
}

export function errorBody(error: AppError, requestId: string): ErrorBody {
  void error;
  void requestId;
  return {
    status: 'fail',
    error: { code: 'INTERNAL', message: '', requestId },
  };
}

export function errorResponse(error: AppError, requestId: string): Response {
  void error;
  void requestId;
  return new Response(null);
}
