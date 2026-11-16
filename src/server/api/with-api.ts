import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import type { NextRequest } from 'next/server';
import type { Logger } from 'pino';
import { messages } from '@/lib/messages';
import { resolveAccess, type Access } from '@/server/access';
import type { RateLimitRule } from '@/server/adapters/rate-limit';
import { getDeps } from '@/server/deps';
import { AppError } from '@/server/errors';
import { toAppError } from '@/server/error-mapper';
import { redactUrl, requestLogger } from '@/server/logger';
import type { SelfUser } from '@/server/modules/users/dto';
import type { z } from '@/server/validation';
import { readBodyLimited, parseMultipart } from './body';
import { corsHeaders, isAllowedOrigin } from './origin';
import { searchParamsToRecord } from './parse-query';
import { errorResponse } from './responses';

type OptionalSchema = z.ZodType | undefined;
type Output<S> = S extends z.ZodType ? z.output<S> : undefined;

/** A JSON body is refused past 1 MB (SEC-17). Only uploads have a larger limit. */
const JSON_BODY_LIMIT = 1_048_576;

export type ApiOptions<
  P extends OptionalSchema = undefined,
  Q extends OptionalSchema = undefined,
  B extends OptionalSchema = undefined,
> = {
  /** Required. A route that declares nothing is refused with 403 (SEC-15). */
  access: Access;
  params?: P;
  query?: Q;
  body?: B;
  /**
   * A multipart upload (S16, SEC-17): the body must be `multipart/form-data`, is byte-counted
   * against `maxBytes`, and reaches the handler as `form`.
   */
  upload?: { maxBytes: number };
  rateLimit?: {
    rule: RateLimitRule;
    key: (input: {
      request: NextRequest;
      body: Output<B>;
      user: SelfUser | null;
    }) => string;
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
  /** The parsed multipart body, present only on a route with the `upload` option. */
  form: FormData | undefined;
  user: SelfUser | null;
  requestId: string;
  log: Logger;
};

type RouteContext = { params: Promise<Record<string, string | string[]>> };

const REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JSON_CONTENT_TYPE = /^application\/json\s*(;|$)/i;
const MULTIPART_CONTENT_TYPE = /^multipart\/form-data\s*(;|$)/i;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// A client-supplied ID is reused only when it is a UUID, so a header can never
// forge or flood a log line (T-01-45). Anything else is replaced (D7, ARC-18).
function requestIdFor(request: NextRequest): string {
  const incoming = request.headers.get('x-request-id');
  return incoming !== null && REQUEST_ID.test(incoming)
    ? incoming
    : crypto.randomUUID();
}

// The content type is checked before any byte is read, and the size is counted while reading (SEC-17).
async function readBody(
  request: NextRequest,
  schema: z.ZodType,
): Promise<unknown> {
  if (!JSON_CONTENT_TYPE.test(request.headers.get('content-type') ?? '')) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE');
  }
  const bytes = await readBodyLimited(request, JSON_BODY_LIMIT);
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new AppError('VALIDATION_ERROR', messages.validation.invalidJson);
  }
  return schema.parse(raw);
}

async function readUpload(
  request: NextRequest,
  maxBytes: number,
): Promise<FormData> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!MULTIPART_CONTENT_TYPE.test(contentType)) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE');
  }
  const bytes = await readBodyLimited(request, maxBytes);
  return parseMultipart(bytes, contentType);
}

function applyHeaders(target: Headers, extra: Record<string, string>): void {
  for (const [name, value] of Object.entries(extra)) {
    if (name.toLowerCase() === 'vary') target.append(name, value);
    else target.set(name, value);
  }
}

// Every response carries the request ID and the CORS headers for its own request.
// A response with read-only headers, such as Response.redirect, is copied first.
function finish(
  response: Response,
  requestId: string,
  origin: string | null,
): Response {
  const extra = { ...corsHeaders(origin), 'x-request-id': requestId };
  try {
    applyHeaders(response.headers, extra);
    return response;
  } catch {
    const copy = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });
    applyHeaders(copy.headers, extra);
    return copy;
  }
}

/**
 * Wraps a Route Handler in the fixed pipeline (plan.md 4.3, ADR 0017):
 *
 * 1. request ID, 2. Origin check on writes (S9), 3. access (S1), 4. params,
 * query, then body, 5. rate limit, 6. the handler. Any throw becomes the
 * plan.md 4.1 error envelope, logged with the same request ID (B9, D7).
 *
 * @param handler - Receives the validated input, the user and a request logger.
 * @param options - `access` is required; a route without it answers 403.
 */
export function withApi<
  P extends OptionalSchema = undefined,
  Q extends OptionalSchema = undefined,
  B extends OptionalSchema = undefined,
>(
  handler: (context: ApiContext<P, Q, B>) => Promise<Response> | Response,
  options: ApiOptions<P, Q, B>,
): (request: NextRequest, context: RouteContext) => Promise<Response> {
  return async (request, routeContext) => {
    const requestId = requestIdFor(request);
    const log = requestLogger(requestId);
    const origin = request.headers.get('origin');
    let retryAfterSeconds: number | undefined;

    try {
      if (WRITE_METHODS.has(request.method) && !isAllowedOrigin(origin)) {
        throw new AppError('FORBIDDEN');
      }
      // options is read defensively: a route built without it must fail closed, not crash.
      const user = await resolveAccess(
        (options as ApiOptions | undefined)?.access,
        request.cookies,
      );

      const rawParams =
        (await (routeContext as RouteContext | undefined)?.params) ?? {};
      const params = options.params
        ? (options.params.parse(rawParams) as Output<P>)
        : (undefined as Output<P>);
      const query = options.query
        ? (options.query.parse(
            searchParamsToRecord(request.nextUrl.searchParams),
          ) as Output<Q>)
        : (undefined as Output<Q>);
      const body = options.body
        ? ((await readBody(request, options.body)) as Output<B>)
        : (undefined as Output<B>);
      const form = options.upload
        ? await readUpload(request, options.upload.maxBytes)
        : undefined;

      if (options.rateLimit) {
        const key = options.rateLimit.key({ request, body, user });
        const result = await getDeps().rateLimiter.consume(
          key,
          options.rateLimit.rule,
        );
        if (!result.allowed) {
          retryAfterSeconds = Math.max(1, result.retryAfterSeconds);
          throw new AppError('RATE_LIMITED');
        }
      }

      const response = await handler({
        request,
        params,
        query,
        body,
        form,
        user,
        requestId,
        log,
      });
      return finish(response, requestId, origin);
    } catch (error) {
      unstable_rethrow(error);
      const appError = toAppError(error);
      const fields = {
        code: appError.code,
        status: appError.status,
        method: request.method,
        path: redactUrl(request.nextUrl.pathname),
      };
      if (appError.status >= 500) {
        log.error(
          { ...fields, err: appError.cause ?? error },
          'request failed',
        );
      } else {
        log.warn(fields, 'request refused');
      }
      const headers: Record<string, string> =
        retryAfterSeconds === undefined
          ? {}
          : { 'retry-after': String(retryAfterSeconds) };
      return finish(
        errorResponse(appError, requestId, headers),
        requestId,
        origin,
      );
    }
  };
}
