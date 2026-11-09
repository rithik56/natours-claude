import 'server-only';
import type { Logger } from 'pino';
import type { NextRequest } from 'next/server';
import type { Access } from '@/server/access';
import type { RateLimitRule } from '@/server/adapters/rate-limit';
import type { SelfUser } from '@/server/modules/users/dto';
import type { z } from '@/server/validation';

type OptionalSchema = z.ZodType | undefined;
type Output<S> = S extends z.ZodType ? z.output<S> : undefined;

export type ApiOptions<
  P extends OptionalSchema = undefined,
  Q extends OptionalSchema = undefined,
  B extends OptionalSchema = undefined,
> = {
  access: Access;
  params?: P;
  query?: Q;
  body?: B;
  rateLimit?: {
    rule: RateLimitRule;
    key: (input: { request: NextRequest; body: Output<B> }) => string;
  };
};

export type ApiContext<
  P extends OptionalSchema = undefined,
  Q extends OptionalSchema = undefined,
  B extends OptionalSchema = undefined,
> = {
  request: NextRequest;
  params: Output<P>;
  query: Output<Q>;
  body: Output<B>;
  user: SelfUser | null;
  requestId: string;
  log: Logger;
};

type RouteContext = { params: Promise<Record<string, string | string[]>> };

// Throwaway RED stub: runs the handler for every request with nothing checked.
export function withApi<
  P extends OptionalSchema = undefined,
  Q extends OptionalSchema = undefined,
  B extends OptionalSchema = undefined,
>(
  handler: (context: ApiContext<P, Q, B>) => Promise<Response> | Response,
  options: ApiOptions<P, Q, B>,
): (request: NextRequest, context: RouteContext) => Promise<Response> {
  void options;
  return async (request) =>
    handler({
      request,
      params: undefined as Output<P>,
      query: undefined as Output<Q>,
      body: undefined as Output<B>,
      user: null,
      requestId: '',
      log: undefined as unknown as Logger,
    });
}
