import 'server-only';
import type { NextRequest } from 'next/server';
import { getConfig } from '@/server/config';

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE';
const ALLOWED_HEADERS = 'content-type';
const PREFLIGHT_MAX_AGE_SECONDS = '600';

function isCorsOrigin(origin: string | null): origin is string {
  return origin !== null && getConfig().corsOrigins.includes(origin);
}

/**
 * Whether a write from this Origin may proceed (S9). A request with no Origin
 * header is accepted: scripts and curl do not send one (SEC-26), and a browser
 * always does on a cross-site write. Otherwise the origin must be APP_URL's
 * origin or one of CORS_ORIGINS, compared exactly.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (origin === null) return true;
  const config = getConfig();
  return origin === config.appOrigin || config.corsOrigins.includes(origin);
}

/**
 * The CORS response headers for this request's Origin (S10). Only an origin in
 * CORS_ORIGINS gets any, never `*`, and credentials are never allowed. They are
 * worked out per request, so one origin's answer is never served to another.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  if (!isCorsOrigin(origin)) return {};
  return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
}

/**
 * Answers an OPTIONS preflight with 204. Route files export it as `OPTIONS`.
 * Only an allowlisted origin is told which methods and headers it may use.
 */
export function handlePreflight(request: NextRequest): Response {
  const headers = corsHeaders(request.headers.get('origin'));
  if (Object.keys(headers).length > 0) {
    headers['Access-Control-Allow-Methods'] = ALLOWED_METHODS;
    headers['Access-Control-Allow-Headers'] = ALLOWED_HEADERS;
    headers['Access-Control-Max-Age'] = PREFLIGHT_MAX_AGE_SECONDS;
  }
  return new Response(null, { status: 204, headers });
}
