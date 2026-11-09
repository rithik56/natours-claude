import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config, proxy } from '@/proxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function page(path = '/', headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${path}`, { headers });
}

function cspOf(response: Response): string {
  const value = response.headers.get('content-security-policy');
  if (value === null) throw new Error('no content-security-policy header');
  return value;
}

function directive(csp: string, name: string): string | undefined {
  return csp
    .split('; ')
    .find((part) => part === name || part.startsWith(`${name} `));
}

function nonceOf(csp: string): string {
  const match = /'nonce-([^']+)'/.exec(csp);
  if (!match?.[1]) throw new Error('no nonce in the policy');
  return match[1];
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('proxy content security policy', () => {
  it('[S11] script-src carries the nonce, strict-dynamic and self, and never unsafe-inline', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const csp = cspOf(proxy(page()));
    const scriptSrc = directive(csp, 'script-src') ?? '';

    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).toContain(`'nonce-${nonceOf(csp)}'`);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('[S11] unsafe-eval appears in script-src only when NODE_ENV is development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const development = directive(cspOf(proxy(page())), 'script-src');
    vi.stubEnv('NODE_ENV', 'production');
    const production = directive(cspOf(proxy(page())), 'script-src');

    expect(development).toContain("'unsafe-eval'");
    expect(production).not.toContain("'unsafe-eval'");
  });

  it('[S11] the fixed directives are present with exactly the planned sources', () => {
    const csp = cspOf(proxy(page()));

    expect(directive(csp, 'default-src')).toBe("default-src 'self'");
    expect(directive(csp, 'style-src-elem')).toBe(
      `style-src-elem 'self' 'nonce-${nonceOf(csp)}'`,
    );
    expect(directive(csp, 'style-src-attr')).toBe(
      "style-src-attr 'unsafe-inline'",
    );
    expect(directive(csp, 'img-src')).toBe("img-src 'self' blob: data:");
    expect(directive(csp, 'font-src')).toBe("font-src 'self'");
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self'");
    expect(directive(csp, 'form-action')).toBe(
      "form-action 'self' https://checkout.stripe.com",
    );
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
  });

  it('[S11] no directive has a wildcard source and the only extra host is Stripe Checkout', () => {
    const csp = cspOf(proxy(page()));
    const sources = csp.split('; ').flatMap((part) => part.split(' ').slice(1));
    const hosts = sources.filter((source) => source.startsWith('https://'));

    expect(sources.some((source) => source === '*')).toBe(false);
    expect(sources.some((source) => source.startsWith('*.'))).toBe(false);
    expect(hosts).toEqual(['https://checkout.stripe.com']);
  });

  it('[S11] two requests get different nonces and otherwise the same policy', () => {
    const first = cspOf(proxy(page()));
    const second = cspOf(proxy(page()));
    const strip = (csp: string) => csp.replaceAll(nonceOf(csp), 'NONCE');

    expect(nonceOf(first)).not.toBe(nonceOf(second));
    expect(strip(first)).toBe(strip(second));
  });

  it('[S11] fifty concurrent calls produce fifty distinct nonces', async () => {
    const nonces = await Promise.all(
      Array.from({ length: 50 }, () =>
        Promise.resolve().then(() => nonceOf(cspOf(proxy(page())))),
      ),
    );

    expect(new Set(nonces).size).toBe(50);
  });

  it('[S11] upgrade-insecure-requests is added only in staging and production', () => {
    const present = (appEnv: string) => {
      vi.stubEnv('APP_ENV', appEnv);
      return directive(cspOf(proxy(page())), 'upgrade-insecure-requests');
    };

    expect(present('staging')).toBe('upgrade-insecure-requests');
    expect(present('production')).toBe('upgrade-insecure-requests');
    expect(present('ci')).toBeUndefined();
    expect(present('development')).toBeUndefined();
  });
});

describe('proxy request id', () => {
  it('[D7] a client-supplied x-request-id is replaced with a server UUID on the response and the forwarded request', () => {
    const response = proxy(page('/', { 'x-request-id': 'attacker-value' }));
    const id = response.headers.get('x-request-id');

    expect(id).toMatch(UUID);
    expect(id).not.toBe('attacker-value');
    expect(response.headers.get('x-middleware-request-x-request-id')).toBe(id);
  });

  it('[D7] the forwarded request also carries the nonce and the policy', () => {
    const response = proxy(page());
    const csp = cspOf(response);

    expect(response.headers.get('x-middleware-request-x-nonce')).toBe(
      nonceOf(csp),
    );
    expect(
      response.headers.get('x-middleware-request-content-security-policy'),
    ).toBe(csp);
  });

  it('[D7] each request gets its own request id', () => {
    const first = proxy(page()).headers.get('x-request-id');
    const second = proxy(page()).headers.get('x-request-id');

    expect(first).not.toBe(second);
  });
});

describe('proxy matcher', () => {
  const entry = config.matcher[0];
  const source = typeof entry === 'string' ? entry : entry?.source;
  const matches = (path: string) => new RegExp(`^${source ?? ''}$`).test(path);

  it('runs on page paths', () => {
    expect(matches('/')).toBe(true);
    expect(matches('/tour/kerala-backwaters-and-hills')).toBe(true);
  });

  it('skips the API, webhooks, probes and static assets', () => {
    expect(matches('/api/v1/tours')).toBe(false);
    expect(matches('/webhooks/stripe')).toBe(false);
    expect(matches('/healthz')).toBe(false);
    expect(matches('/readyz')).toBe(false);
    expect(matches('/_next/static/chunks/a.js')).toBe(false);
    expect(matches('/_next/image')).toBe(false);
    expect(matches('/favicon.ico')).toBe(false);
  });

  it('skips router prefetches', () => {
    const missing = typeof entry === 'string' ? [] : (entry?.missing ?? []);

    expect(missing).toEqual([
      { type: 'header', key: 'next-router-prefetch' },
      { type: 'header', key: 'purpose', value: 'prefetch' },
    ]);
  });
});
