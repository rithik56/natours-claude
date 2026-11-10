import { NextRequest } from 'next/server';
import { getConfig } from '@/server/config';
import { SESSION_COOKIE, signSession } from '@/server/session';

type RouteContext = { params: Promise<Record<string, string | string[]>> };
type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<Response> | Response;
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

/** A Route Handler module: the file's exports, such as `import * as route from '@/app/healthz/route'`. */
type RouteModule = Partial<Record<Method, RouteHandler>>;

type CallOptions = {
  method?: Method;
  /** Path with an optional query string, such as `/api/v1/tours?page=2`. */
  path: string;
  params?: Record<string, string | string[]>;
  /** An object is sent as JSON, a string as a raw body and FormData as multipart. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Defaults to APP_URL's origin on writes. `null` sends no Origin header. */
  origin?: string | null;
  /** Sent as x-forwarded-for. */
  ip?: string;
  /** Sends the session cookie of this user. */
  as?: { _id: unknown } | { id: string };
};

type CallResult = { status: number; headers: Headers; body: unknown };

const WRITE_METHODS = new Set<Method>(['POST', 'PUT', 'PATCH', 'DELETE']);

function userId(user: { _id: unknown } | { id: string }): string {
  return 'id' in user ? user.id : String(user._id);
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  const type = response.headers.get('content-type') ?? '';
  if (text === '' || !type.includes('json')) return text;
  return JSON.parse(text) as unknown;
}

/**
 * Calls a Route Handler the way Next does, without a server (QA-17): builds a
 * NextRequest, passes `params` as a Promise, and returns the status, headers and
 * parsed body. A handler that throws, such as one that redirects, rejects.
 */
export async function callRoute(
  routeModule: RouteModule,
  options: CallOptions,
): Promise<CallResult> {
  const method = options.method ?? 'GET';
  const handler = routeModule[method];
  if (!handler) throw new Error(`The route module has no ${method} handler`);
  const config = getConfig();

  const headers = new Headers(options.headers);
  const origin =
    options.origin === undefined
      ? WRITE_METHODS.has(method)
        ? config.appOrigin
        : null
      : options.origin;
  if (origin !== null) headers.set('origin', origin);
  if (options.ip !== undefined) headers.set('x-forwarded-for', options.ip);
  if (options.as !== undefined) {
    const token = await signSession(userId(options.as));
    headers.set('cookie', `${SESSION_COOKIE}=${token}`);
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData || typeof options.body === 'string') {
    body = options.body;
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers.set('content-type', 'application/json');
  }

  const request = new NextRequest(new URL(options.path, config.appOrigin), {
    method,
    headers,
    body,
  });
  const response = await handler(request, {
    params: Promise.resolve(options.params ?? {}),
  });
  return {
    status: response.status,
    headers: response.headers,
    body: await readBody(response),
  };
}
