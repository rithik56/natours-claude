import { NextResponse, type NextRequest } from 'next/server';

// ARC-26: the proxy reads process.env directly and imports nothing from src/server.

function buildPolicy(nonce: string): string {
  const development = process.env.NODE_ENV === 'development';
  const appEnv = process.env.APP_ENV;
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    `style-src-elem 'self' 'nonce-${nonce}'`,
    // ADR 0011: next/image writes inline style attributes, which a nonce cannot cover.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ];
  if (appEnv === 'staging' || appEnv === 'production') {
    directives.push('upgrade-insecure-requests');
  }
  return directives.join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  // D7: a client-supplied request ID is never trusted, so it is always replaced.
  const requestId = crypto.randomUUID();
  const policy = buildPolicy(nonce);

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('x-request-id', requestId);
  headers.set('content-security-policy', policy);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('content-security-policy', policy);
  response.headers.set('x-request-id', requestId);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api|webhooks|healthz|readyz|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
