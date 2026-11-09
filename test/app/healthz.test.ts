import type { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as healthz from '@/app/healthz/route';
import { callRoute } from '../helpers/call-route';

type MongoCache = { __natoursMongo?: unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('/healthz', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as MongoCache).__natoursMongo;
  });

  it('[S2] answers 200 with exactly { status: "ok" } and a request ID', async () => {
    const result = await callRoute(healthz, {
      method: 'GET',
      path: '/healthz',
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ status: 'ok' });
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(UUID.test(result.headers.get('x-request-id') ?? '')).toBe(true);
  });

  it('[S2] is public: an anonymous caller with an unreadable cookie still gets 200', async () => {
    const result = await callRoute(healthz, {
      path: '/healthz',
      headers: { cookie: 'natours_session=not-a-token' },
    });

    expect(result.status).toBe(200);
  });

  it('[S2] never touches the database, so it answers while MongoDB is down', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:1/natours');
    vi.stubEnv('DB_SERVER_SELECTION_TIMEOUT_MS', '500');
    delete (globalThis as MongoCache).__natoursMongo;
    vi.resetModules();
    const fresh = await import('@/app/healthz/route');

    const startedAt = Date.now();
    const result = await callRoute(fresh, { path: '/healthz' });
    const elapsed = Date.now() - startedAt;

    expect(result.status).toBe(200);
    expect(elapsed).toBeLessThan(400);
    expect((globalThis as MongoCache).__natoursMongo).toBeUndefined();
  });

  it('[S2] reveals nothing beyond the status: no version, uptime or host', async () => {
    const result = await callRoute(healthz, { path: '/healthz' });

    expect(Object.keys(result.body as object)).toEqual(['status']);
    expect(JSON.stringify(result.body)).not.toMatch(
      /version|uptime|host|node/i,
    );
  });
});

describe('callRoute', () => {
  const echo = {
    POST: async (
      request: NextRequest,
      context: { params: Promise<Record<string, string | string[]>> },
    ) =>
      Response.json({
        contentType: request.headers.get('content-type'),
        origin: request.headers.get('origin'),
        cookie: request.headers.get('cookie'),
        forwarded: request.headers.get('x-forwarded-for'),
        custom: request.headers.get('x-custom'),
        text: await request.text(),
        params: await context.params,
        path: request.nextUrl.pathname,
        search: request.nextUrl.search,
      }),
    GET: async (request: NextRequest) =>
      Response.json({ origin: request.headers.get('origin') }),
    DELETE: async () => new Response(null, { status: 204 }),
  };
  type Echoed = {
    contentType: string | null;
    origin: string | null;
    cookie: string | null;
    forwarded: string | null;
    custom: string | null;
    text: string;
    params: Record<string, string | string[]>;
    path: string;
    search: string;
  };

  it('sends an object body as JSON with a JSON content type', async () => {
    const result = await callRoute(echo, {
      method: 'POST',
      path: '/x',
      body: { name: 'Aarav Mehta' },
    });

    const seen = result.body as Echoed;
    expect(seen.contentType).toBe('application/json');
    expect(JSON.parse(seen.text)).toEqual({ name: 'Aarav Mehta' });
  });

  it('sends a string body raw and FormData as multipart', async () => {
    const form = new FormData();
    form.set('name', 'Aarav Mehta');

    const raw = await callRoute(echo, {
      method: 'POST',
      path: '/x',
      body: '{ not json',
    });
    const multipart = await callRoute(echo, {
      method: 'POST',
      path: '/x',
      body: form,
    });

    expect((raw.body as Echoed).text).toBe('{ not json');
    expect((raw.body as Echoed).contentType).not.toContain('json');
    expect((multipart.body as Echoed).contentType).toContain(
      'multipart/form-data',
    );
    expect((multipart.body as Echoed).text).toContain('Aarav Mehta');
  });

  it('defaults Origin to the app origin on writes, and lets a test set it or omit it', async () => {
    const byDefault = await callRoute(echo, { method: 'POST', path: '/x' });
    const foreign = await callRoute(echo, {
      method: 'POST',
      path: '/x',
      origin: 'https://evil.example',
    });
    const omitted = await callRoute(echo, {
      method: 'POST',
      path: '/x',
      origin: null,
    });
    const read = await callRoute(echo, { path: '/x' });

    expect((byDefault.body as Echoed).origin).toBe('http://localhost:3000');
    expect((foreign.body as Echoed).origin).toBe('https://evil.example');
    expect((omitted.body as Echoed).origin).toBeNull();
    expect((read.body as Echoed).origin).toBeNull();
  });

  it('sets the session cookie for `as`, x-forwarded-for for `ip` and passes other headers', async () => {
    const result = await callRoute(echo, {
      method: 'POST',
      path: '/x',
      as: { id: '6579a1b2c3d4e5f607182930' },
      ip: '203.0.113.7',
      headers: { 'x-custom': 'yes' },
    });

    const seen = result.body as Echoed;
    expect(seen.cookie?.startsWith('natours_session=')).toBe(true);
    expect(seen.forwarded).toBe('203.0.113.7');
    expect(seen.custom).toBe('yes');
  });

  it('hands params over as a Promise and keeps the query string', async () => {
    const result = await callRoute(echo, {
      method: 'POST',
      path: '/api/v1/tours?page=2&sort=price',
      params: { id: '42', rest: ['a', 'b'] },
    });

    const seen = result.body as Echoed;
    expect(seen.params).toEqual({ id: '42', rest: ['a', 'b'] });
    expect(seen.path).toBe('/api/v1/tours');
    expect(seen.search).toBe('?page=2&sort=price');
  });

  it('returns the status, the headers and a parsed body, and an empty string for no body', async () => {
    const withBody = await callRoute(echo, { path: '/x' });
    const empty = await callRoute(echo, { method: 'DELETE', path: '/x' });

    expect(withBody.status).toBe(200);
    expect(withBody.headers.get('content-type')).toContain('json');
    expect(withBody.body).toEqual({ origin: null });
    expect(empty.status).toBe(204);
    expect(empty.body).toBe('');
  });

  it('rejects when the module has no handler for the method', async () => {
    await expect(
      callRoute({ GET: echo.GET }, { method: 'PUT', path: '/x' }),
    ).rejects.toThrow('The route module has no PUT handler');
  });
});
