import { redirect } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { messages } from '@/lib/messages';
import { ok } from '@/server/api/responses';
import { withApi, type ApiContext } from '@/server/api/with-api';
import { AppError } from '@/server/errors';
import * as usersService from '@/server/modules/users/service';
import { z } from '@/server/validation';
import { useTestDatabase } from '../../helpers/db';
import { callRoute } from '../../helpers/call-route';
import { createUser } from '../../helpers/factories';
import { mockSession } from '../../helpers/mock-session';

const logged = vi.hoisted(() => ({ lines: [] as Record<string, unknown>[] }));

// CORS_ORIGINS is read on the first getConfig() call, which happens inside the first test.
vi.stubEnv('CORS_ORIGINS', 'https://partner.example');

// Every line the app logs lands in logged.lines, so tests can read what a request wrote.
vi.mock('@/server/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/logger')>();
  const base = actual.createLogger({
    level: 'debug',
    destination: {
      write(chunk: string) {
        logged.lines.push(JSON.parse(chunk) as Record<string, unknown>);
      },
    },
  });
  return {
    ...actual,
    getLogger: () => base,
    requestLogger: (requestId: string) => actual.requestLogger(requestId, base),
  };
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const APP = 'http://localhost:3000';
const PARTNER = 'https://partner.example';
const EVIL = 'https://evil.example';

const handler = vi.fn(async (context: Pick<ApiContext, 'user'>) =>
  ok({ id: context.user?.id ?? null }),
);

function route(access: Parameters<typeof withApi>[1]['access']) {
  const run = withApi(handler, { access });
  return { GET: run, POST: run, PUT: run, PATCH: run, DELETE: run };
}

type ErrorEnvelope = {
  status: string;
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
};

function errorOf(body: unknown): ErrorEnvelope['error'] {
  return (body as ErrorEnvelope).error;
}

beforeEach(() => {
  handler.mockClear();
  logged.lines.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withApi', () => {
  useTestDatabase();

  describe('access (S1)', () => {
    it('[S1] answers 403 and never runs the handler when no options are given', async () => {
      const { user } = await createUser({ role: 'admin' });
      const unguarded = { GET: withApi(handler, undefined as never) };

      const result = await callRoute(unguarded, { path: '/x', as: user });

      expect(result.status).toBe(403);
      expect(errorOf(result.body).code).toBe('FORBIDDEN');
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] answers 403 and never runs the handler when the access declaration is missing', async () => {
      const { user } = await createUser({ role: 'admin' });
      const unguarded = { GET: withApi(handler, {} as never) };

      const result = await callRoute(unguarded, { path: '/x', as: user });

      expect(result.status).toBe(403);
      expect(errorOf(result.body).code).toBe('FORBIDDEN');
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] answers 403 for an access value it does not know', async () => {
      const { user } = await createUser({ role: 'admin' });

      for (const bad of ['admin', 'anyone', '', null, 7, { roles: 'admin' }]) {
        const guarded = { GET: withApi(handler, { access: bad as never }) };

        const result = await callRoute(guarded, { path: '/x', as: user });

        expect(result.status).toBe(403);
      }
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] a public route runs for an anonymous visitor, even with an unreadable cookie', async () => {
      const result = await callRoute(route('public'), {
        path: '/x',
        headers: { cookie: 'natours_session=not-a-token' },
      });

      expect(result.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]?.[0].user).toBeNull();
    });

    it('[S1] an auth route answers 401 UNAUTHENTICATED to an anonymous request and runs for a user', async () => {
      const { user } = await createUser({ role: 'user' });

      const anonymous = await callRoute(route('auth'), { path: '/x' });
      const signedIn = await callRoute(route('auth'), { path: '/x', as: user });

      expect(anonymous.status).toBe(401);
      expect(errorOf(anonymous.body).code).toBe('UNAUTHENTICATED');
      expect(signedIn.status).toBe(200);
      const received = handler.mock.calls[0]?.[0].user;
      expect(Object.keys(received ?? {}).sort()).toEqual([
        'email',
        'id',
        'name',
        'photo',
        'role',
      ]);
      expect(received?.id).toBe(String(user._id));
    });

    it('[S1] an owner route needs a signed-in user, like an auth route', async () => {
      const { user } = await createUser({ role: 'user' });

      const anonymous = await callRoute(route('owner'), { path: '/x' });
      const signedIn = await callRoute(route('owner'), {
        path: '/x',
        as: user,
      });

      expect(anonymous.status).toBe(401);
      expect(signedIn.status).toBe(200);
    });

    it('[S1] a deactivated account is refused with 401 even with a valid cookie', async () => {
      const { user } = await createUser({ role: 'user', active: false });

      const result = await callRoute(route('auth'), { path: '/x', as: user });

      expect(result.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] a role list refuses a lead-guide with 403 and admits an admin', async () => {
      const { user: leadGuide } = await createUser({ role: 'lead-guide' });
      const { user: admin } = await createUser({ role: 'admin' });
      const adminOnly = route({ roles: ['admin'] });

      const refused = await callRoute(adminOnly, { path: '/x', as: leadGuide });
      const admitted = await callRoute(adminOnly, { path: '/x', as: admin });

      expect(refused.status).toBe(403);
      expect(errorOf(refused.body).code).toBe('FORBIDDEN');
      expect(admitted.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('[S1] an admin is refused on a route for other roles: no role hierarchy', async () => {
      const { user: admin } = await createUser({ role: 'admin' });

      const result = await callRoute(
        route({ roles: ['guide', 'lead-guide'] }),
        {
          path: '/x',
          as: admin,
        },
      );

      expect(result.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] an empty role list admits nobody, not even an admin', async () => {
      const { user: admin } = await createUser({ role: 'admin' });

      const result = await callRoute(route({ roles: [] }), {
        path: '/x',
        as: admin,
      });

      expect(result.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] a role list answers an anonymous request with 401, not 403', async () => {
      const result = await callRoute(route({ roles: ['admin'] }), {
        path: '/x',
      });

      expect(result.status).toBe(401);
    });

    it('[S1] access is checked before the body: an anonymous request with a bad body gets 401', async () => {
      const guarded = {
        POST: withApi(handler, {
          access: 'auth',
          body: z.strictObject({ name: z.string().min(1) }),
        }),
      };

      const result = await callRoute(guarded, {
        method: 'POST',
        path: '/x',
        body: '{ not json',
        headers: { 'content-type': 'application/json' },
      });

      expect(result.status).toBe(401);
      expect(errorOf(result.body).code).toBe('UNAUTHENTICATED');
    });

    it('[S1] access is checked before the rate limit: refused requests do not use the allowance', async () => {
      const { user } = await createUser({ role: 'user' });
      const limited = {
        GET: withApi(handler, {
          access: 'auth',
          rateLimit: {
            rule: { name: 'access-first', points: 1, durationSeconds: 60 },
            key: () => 'shared',
          },
        }),
      };

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const anonymous = await callRoute(limited, { path: '/x' });
        expect(anonymous.status).toBe(401);
      }
      const signedIn = await callRoute(limited, { path: '/x', as: user });

      expect(signedIn.status).toBe(200);
    });

    it('[S1] two concurrent calls to an admin route get 200 for the admin and 401 for the anonymous caller', async () => {
      const { user: admin } = await createUser({ role: 'admin' });
      const adminOnly = route({ roles: ['admin'] });

      const [asAdmin, anonymous] = await Promise.all([
        callRoute(adminOnly, { path: '/x', as: admin }),
        callRoute(adminOnly, { path: '/x' }),
      ]);

      expect(asAdmin.status).toBe(200);
      expect(anonymous.status).toBe(401);
    });

    it('[S1] reads the session from the request, not from the ambient cookie store', async () => {
      const { user } = await createUser({ role: 'admin' });
      await mockSession(user);

      const result = await callRoute(route({ roles: ['admin'] }), {
        path: '/x',
      });

      expect(result.status).toBe(401);
    });

    it('[S1] a database outage while reading the user is a 503, not a logged-out 401', async () => {
      const { user } = await createUser({ role: 'user' });
      vi.spyOn(usersService, 'findActiveById').mockRejectedValue(
        new AppError('SERVICE_UNAVAILABLE'),
      );

      const result = await callRoute(route('auth'), { path: '/x', as: user });

      expect(result.status).toBe(503);
      expect(errorOf(result.body).code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('origin check on writes (S9)', () => {
    it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
      '[S9] a %s from a foreign origin is refused with 403 before the handler runs',
      async (method) => {
        const result = await callRoute(route('public'), {
          method,
          path: '/x',
          origin: EVIL,
        });

        expect(result.status).toBe(403);
        expect(errorOf(result.body).code).toBe('FORBIDDEN');
        expect(handler).not.toHaveBeenCalled();
      },
    );

    it('[S9] a write from the app origin passes', async () => {
      const result = await callRoute(route('public'), {
        method: 'POST',
        path: '/x',
        origin: APP,
      });

      expect(result.status).toBe(200);
    });

    it('[S9] a write with no Origin header passes (scripts and curl)', async () => {
      const result = await callRoute(route('public'), {
        method: 'POST',
        path: '/x',
        origin: null,
      });

      expect(result.status).toBe(200);
    });

    it('[S9] a GET with a foreign origin is not refused and gets no CORS header', async () => {
      const result = await callRoute(route('public'), {
        path: '/x',
        headers: { origin: EVIL },
      });

      expect(result.status).toBe(200);
      expect(result.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('[S9] lookalike origins are refused: another port, another scheme, a longer host, the string null, an empty value', async () => {
      const lookalikes = [
        'http://localhost:3001',
        'https://localhost:3000',
        'http://localhost:3000.evil.example',
        'http://evil.example/http://localhost:3000',
        'http://localhost:3000/',
        'null',
        '',
      ];

      for (const origin of lookalikes) {
        const result = await callRoute(route('public'), {
          method: 'POST',
          path: '/x',
          origin,
        });

        expect(result.status).toBe(403);
      }
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S9] the origin check comes before access and validation', async () => {
      const guarded = {
        POST: withApi(handler, {
          access: 'auth',
          body: z.strictObject({ name: z.string().min(1) }),
        }),
      };

      const result = await callRoute(guarded, {
        method: 'POST',
        path: '/x',
        origin: EVIL,
        body: '{ not json',
        headers: { 'content-type': 'application/json' },
      });

      expect(result.status).toBe(403);
      expect(errorOf(result.body).code).toBe('FORBIDDEN');
    });

    it('[S9] a refused cross-origin write carries no CORS header', async () => {
      const result = await callRoute(route('public'), {
        method: 'POST',
        path: '/x',
        origin: EVIL,
      });

      expect(result.headers.get('access-control-allow-origin')).toBeNull();
    });
  });

  describe('CORS (S10)', () => {
    it('[S10] an allowlisted origin gets its own origin back with Vary: Origin', async () => {
      const result = await callRoute(route('public'), {
        path: '/x',
        headers: { origin: PARTNER },
      });

      expect(result.headers.get('access-control-allow-origin')).toBe(PARTNER);
      expect(result.headers.get('vary')).toMatch(/Origin/i);
    });

    it('[S10] a write from an allowlisted origin passes the origin check', async () => {
      const result = await callRoute(route('public'), {
        method: 'POST',
        path: '/x',
        origin: PARTNER,
      });

      expect(result.status).toBe(200);
      expect(result.headers.get('access-control-allow-origin')).toBe(PARTNER);
    });

    it('[S10] a non-listed origin gets no Access-Control header at all', async () => {
      const result = await callRoute(route('public'), {
        path: '/x',
        headers: { origin: EVIL },
      });

      const names = [...result.headers.keys()].filter((name) =>
        name.startsWith('access-control-'),
      );
      expect(names).toEqual([]);
    });

    it('[S10] the allowed origin is never a wildcard and credentials are never allowed', async () => {
      const origins = [PARTNER, EVIL, '*', APP, 'null'];

      for (const origin of origins) {
        const result = await callRoute(route('public'), {
          path: '/x',
          headers: { origin },
        });

        expect(result.headers.get('access-control-allow-origin')).not.toBe('*');
        expect(
          result.headers.get('access-control-allow-credentials'),
        ).toBeNull();
      }
    });

    it('[S10] concurrent requests from a listed and a non-listed origin each get their own answer', async () => {
      const [listed, other] = await Promise.all([
        callRoute(route('public'), {
          path: '/x',
          headers: { origin: PARTNER },
        }),
        callRoute(route('public'), { path: '/x', headers: { origin: EVIL } }),
      ]);

      expect(listed.headers.get('access-control-allow-origin')).toBe(PARTNER);
      expect(other.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('[S10] the error response of an allowlisted origin carries the CORS header too', async () => {
      const result = await callRoute(route('auth'), {
        path: '/x',
        headers: { origin: PARTNER },
      });

      expect(result.status).toBe(401);
      expect(result.headers.get('access-control-allow-origin')).toBe(PARTNER);
    });
  });

  describe('validation', () => {
    const schemas = {
      params: z.strictObject({ id: z.string().regex(/^[0-9a-f]{24}$/) }),
      query: z.strictObject({
        page: z.coerce.number().int().min(1).default(1),
      }),
      body: z.strictObject({
        name: z.string().min(1),
        email: z.email(),
      }),
    };
    const validated = {
      POST: withApi(
        async ({ params, query, body }) => ok({ params, query, body }),
        { access: 'public', ...schemas },
      ),
    };
    const goodParams = { id: 'a'.repeat(24) };
    const goodBody = { name: 'Aarav Mehta', email: 'aarav@example.com' };

    it('passes parsed params, query and body to the handler', async () => {
      const result = await callRoute(validated, {
        method: 'POST',
        path: '/x?page=3',
        params: goodParams,
        body: goodBody,
      });

      expect(result.status).toBe(200);
      expect((result.body as { data: unknown }).data).toEqual({
        params: goodParams,
        query: { page: 3 },
        body: goodBody,
      });
    });

    it('answers 400 with the validation envelope and no Zod English for a bad body', async () => {
      const result = await callRoute(validated, {
        method: 'POST',
        path: '/x',
        params: goodParams,
        body: { name: '', email: 'nope', extra: 1 },
      });

      expect(result.status).toBe(400);
      expect(errorOf(result.body).code).toBe('VALIDATION_ERROR');
      expect(errorOf(result.body).details).toEqual([
        { path: 'name', message: messages.validation.required },
        { path: 'email', message: messages.validation.invalidEmail },
        { path: '', message: messages.validation.unknownField },
      ]);
      expect(JSON.stringify(result.body)).not.toMatch(
        /Invalid input|expected|too_small|invalid_type|Unrecognized/i,
      );
    });

    it('answers 400 for an invalid query value', async () => {
      const result = await callRoute(validated, {
        method: 'POST',
        path: '/x?page=abc',
        params: goodParams,
        body: goodBody,
      });

      expect(result.status).toBe(400);
      expect(errorOf(result.body).details).toEqual([
        { path: 'page', message: messages.validation.invalidType },
      ]);
    });

    it('answers 400 for an unknown query key', async () => {
      const result = await callRoute(validated, {
        method: 'POST',
        path: '/x?admin=true',
        params: goodParams,
        body: goodBody,
      });

      expect(result.status).toBe(400);
      expect(errorOf(result.body).code).toBe('VALIDATION_ERROR');
    });

    it('answers 400 for invalid params, which arrive as a Promise', async () => {
      const result = await callRoute(validated, {
        method: 'POST',
        path: '/x',
        params: { id: 'not-an-id' },
        body: goodBody,
      });

      expect(result.status).toBe(400);
      expect(errorOf(result.body).details).toEqual([
        { path: 'id', message: messages.validation.invalidFormat },
      ]);
    });

    it('answers 415 for a body that is not JSON', async () => {
      const result = await callRoute(validated, {
        method: 'POST',
        path: '/x',
        params: goodParams,
        body: 'name=Aarav',
        headers: { 'content-type': 'text/plain' },
      });

      expect(result.status).toBe(415);
      expect(errorOf(result.body).code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });

    it('answers 415 for multipart and for a request with no content type', async () => {
      const form = new FormData();
      form.set('name', 'Aarav Mehta');

      const multipart = await callRoute(validated, {
        method: 'POST',
        path: '/x',
        params: goodParams,
        body: form,
      });
      const bare = await callRoute(validated, {
        method: 'POST',
        path: '/x',
        params: goodParams,
      });

      expect(multipart.status).toBe(415);
      expect(bare.status).toBe(415);
    });

    it('answers 400 with the invalid-JSON message for a malformed body', async () => {
      const result = await callRoute(validated, {
        method: 'POST',
        path: '/x',
        params: goodParams,
        body: '{ "name": ',
        headers: { 'content-type': 'application/json' },
      });

      expect(result.status).toBe(400);
      expect(errorOf(result.body).code).toBe('VALIDATION_ERROR');
      expect(errorOf(result.body).message).toBe(
        messages.validation.invalidJson,
      );
    });

    it('does not read a body when the route declares no body schema', async () => {
      const seen = vi.fn(async (context: ApiContext) => ok(context.body));
      const result = await callRoute(
        { POST: withApi(seen, { access: 'public' }) },
        {
          method: 'POST',
          path: '/x',
          body: '{ not json',
          headers: { 'content-type': 'application/json' },
        },
      );

      expect(result.status).toBe(200);
      expect(seen.mock.calls[0]?.[0].body).toBeUndefined();
    });
  });

  describe('rate limit', () => {
    function limited(points: number) {
      return {
        GET: withApi(handler, {
          access: 'public',
          rateLimit: {
            rule: { name: 'probe', points, durationSeconds: 60 },
            key: ({ request }) => request.headers.get('x-forwarded-for') ?? '',
          },
        }),
      };
    }

    it('refuses the third call with 429 and says how long to wait', async () => {
      const probe = limited(2);

      const first = await callRoute(probe, { path: '/x', ip: '203.0.113.7' });
      const second = await callRoute(probe, { path: '/x', ip: '203.0.113.7' });
      const third = await callRoute(probe, { path: '/x', ip: '203.0.113.7' });

      expect([first.status, second.status, third.status]).toEqual([
        200, 200, 429,
      ]);
      expect(errorOf(third.body).code).toBe('RATE_LIMITED');
      const wait = Number(third.headers.get('retry-after'));
      expect(Number.isInteger(wait) && wait >= 1 && wait <= 60).toBe(true);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('counts each key on its own', async () => {
      const probe = limited(1);

      await callRoute(probe, { path: '/x', ip: '203.0.113.7' });
      const other = await callRoute(probe, { path: '/x', ip: '203.0.113.8' });

      expect(other.status).toBe(200);
    });

    it('hands the parsed body to the key function', async () => {
      const keyed = {
        POST: withApi(handler, {
          access: 'public',
          body: z.strictObject({ email: z.email() }),
          rateLimit: {
            rule: { name: 'by-body', points: 1, durationSeconds: 60 },
            key: ({ body }) => body.email,
          },
        }),
      };

      const first = await callRoute(keyed, {
        method: 'POST',
        path: '/x',
        body: { email: 'aarav@example.com' },
      });
      const again = await callRoute(keyed, {
        method: 'POST',
        path: '/x',
        body: { email: 'aarav@example.com' },
      });
      const different = await callRoute(keyed, {
        method: 'POST',
        path: '/x',
        body: { email: 'diya@example.com' },
      });

      expect([first.status, again.status, different.status]).toEqual([
        200, 429, 200,
      ]);
    });
  });

  describe('request ID and logging (D7)', () => {
    const failing = withApi(
      async () => {
        throw new AppError('NOT_FOUND');
      },
      { access: 'public' },
    );

    it('[D7] mints a UUID for a request that has none, in the header, the error body and every log line', async () => {
      const result = await callRoute({ GET: failing }, { path: '/x' });

      const id = result.headers.get('x-request-id') ?? '';
      expect(UUID.test(id)).toBe(true);
      expect(errorOf(result.body).requestId).toBe(id);
      expect(logged.lines.length).toBeGreaterThan(0);
      expect(logged.lines.every((line) => line.requestId === id)).toBe(true);
    });

    it('[D7] reuses an incoming UUID', async () => {
      const incoming = '3f2a6c1e-9b1d-4a3e-8f55-0c1d2e3f4a5b';

      const result = await callRoute(
        { GET: failing },
        { path: '/x', headers: { 'x-request-id': incoming } },
      );

      expect(result.headers.get('x-request-id')).toBe(incoming);
      expect(errorOf(result.body).requestId).toBe(incoming);
    });

    it('[D7] replaces an incoming value that is not a UUID', async () => {
      const unsafe = ['abc', 'x'.repeat(2000), '../../etc/passwd', '{{7*7}}'];

      for (const incoming of unsafe) {
        const result = await callRoute(
          { GET: failing },
          { path: '/x', headers: { 'x-request-id': incoming } },
        );

        const id = result.headers.get('x-request-id') ?? '';
        expect(id === incoming).toBe(false);
        expect(UUID.test(id)).toBe(true);
        expect(JSON.stringify(logged.lines)).not.toContain(incoming);
      }
    });

    it('[D7] the cross-origin refusal already carries the request ID in its body and header', async () => {
      const result = await callRoute(route('public'), {
        method: 'POST',
        path: '/x',
        origin: EVIL,
      });

      const id = result.headers.get('x-request-id') ?? '';
      expect(UUID.test(id)).toBe(true);
      expect(errorOf(result.body).requestId).toBe(id);
    });

    it('[D7] a successful response carries a request ID header', async () => {
      const result = await callRoute(route('public'), { path: '/x' });

      expect(UUID.test(result.headers.get('x-request-id') ?? '')).toBe(true);
    });

    it('[D7] two concurrent failing requests log only their own IDs', async () => {
      const slow = withApi(
        async ({ request, log }) => {
          log.info('started');
          await new Promise((resolve) => setTimeout(resolve, 20));
          throw new Error(`failed ${request.nextUrl.pathname}`);
        },
        { access: 'public' },
      );
      const first = '11111111-1111-4111-8111-111111111111';
      const second = '22222222-2222-4222-8222-222222222222';

      await Promise.all([
        callRoute(
          { GET: slow },
          {
            path: '/first',
            headers: { 'x-request-id': first },
          },
        ),
        callRoute(
          { GET: slow },
          {
            path: '/second',
            headers: { 'x-request-id': second },
          },
        ),
      ]);

      const own = (id: string) =>
        logged.lines.filter((line) => line.requestId === id);
      expect(own(first).length).toBeGreaterThanOrEqual(2);
      expect(own(second).length).toBeGreaterThanOrEqual(2);
      expect(own(first).length + own(second).length).toBe(logged.lines.length);
      expect(JSON.stringify(own(first))).not.toContain('/second');
      expect(JSON.stringify(own(second))).not.toContain('/first');
    });

    it('logs a refusal below 500 as a warning and a failure at 500 or above as an error', async () => {
      const broken = withApi(
        async () => {
          throw new Error('disk full');
        },
        { access: 'public' },
      );

      await callRoute({ GET: failing }, { path: '/x' });
      const warned = logged.lines.map((line) => line.level);
      await callRoute({ GET: broken }, { path: '/x' });
      const levels = logged.lines.map((line) => line.level);

      expect(warned).toEqual([40]);
      expect(levels).toEqual([40, 50]);
    });

    it('never writes a password, a cookie or a request body to the log', async () => {
      const { user } = await createUser({ role: 'user' });
      const guarded = {
        POST: withApi(handler, {
          access: 'public',
          body: z.strictObject({ password: z.string().min(40) }),
        }),
      };

      await callRoute(guarded, {
        method: 'POST',
        path: '/x?token=query-secret-value',
        body: { password: 'Short-body-secret-value' },
        as: user,
      });

      const written = JSON.stringify(logged.lines);
      expect(logged.lines.length).toBeGreaterThan(0);
      expect(written).not.toContain('Short-body-secret-value');
      expect(written).not.toContain('natours_session');
      expect(written).not.toContain('query-secret-value');
    });
  });

  describe('errors (B9)', () => {
    it('[B9] an unknown thrown Error gives a generic INTERNAL envelope that leaks nothing', async () => {
      const leaky = withApi(
        async () => {
          throw new Error('connect mongodb://admin:hunter2@db.internal:27017');
        },
        { access: 'public' },
      );

      const result = await callRoute({ GET: leaky }, { path: '/x' });

      const text = JSON.stringify(result.body);
      expect(result.status).toBe(500);
      expect(errorOf(result.body).code).toBe('INTERNAL');
      expect(errorOf(result.body).message).toBe(messages.errors.INTERNAL);
      expect(errorOf(result.body).requestId).toBe(
        result.headers.get('x-request-id'),
      );
      expect((result.body as ErrorEnvelope).status).toBe('error');
      expect(text).not.toMatch(/hunter2|mongodb|db\.internal|stack| at /);
    });

    it('[B9] the detail stays in the log, with the request ID', async () => {
      const leaky = withApi(
        async () => {
          throw new Error('connect to db.internal failed');
        },
        { access: 'public' },
      );

      const result = await callRoute({ GET: leaky }, { path: '/x' });

      const written = JSON.stringify(logged.lines);
      expect(written).toContain('db.internal');
      expect(written).toContain(result.headers.get('x-request-id') ?? '');
    });

    it('[B9] a thrown string, undefined or null gives a 500 envelope with the request ID', async () => {
      for (const thrown of ['x', undefined, null]) {
        const odd = withApi(
          async () => {
            throw thrown;
          },
          { access: 'public' },
        );

        const result = await callRoute({ GET: odd }, { path: '/x' });

        expect(result.status).toBe(500);
        expect(errorOf(result.body).code).toBe('INTERNAL');
        expect(UUID.test(errorOf(result.body).requestId)).toBe(true);
      }
    });

    it('[B9] a missing real adapter in staging is a generic INTERNAL', async () => {
      const missing = withApi(
        async () => {
          throw new Error(
            'No real mailer adapter is configured yet (ADR 0016); Phase 5 adds it',
          );
        },
        { access: 'public' },
      );

      const result = await callRoute({ GET: missing }, { path: '/x' });

      expect(result.status).toBe(500);
      expect(JSON.stringify(result.body)).not.toContain('adapter');
    });

    it('[B9] an AppError thrown by a handler keeps its code and status', async () => {
      const gone = withApi(
        async () => {
          throw new AppError('CONFLICT', undefined, [
            { path: 'email', message: messages.errors.CONFLICT },
          ]);
        },
        { access: 'public' },
      );

      const result = await callRoute({ GET: gone }, { path: '/x' });

      expect(result.status).toBe(409);
      expect(errorOf(result.body).details).toEqual([
        { path: 'email', message: messages.errors.CONFLICT },
      ]);
    });

    it('[B9] a Mongoose CastError from a handler gives 400 without the value', async () => {
      const cast = withApi(
        async () => {
          const { User } = await import('@/server/modules/users/model');
          await User.findById('not-an-id');
          return ok(null);
        },
        { access: 'public' },
      );

      const result = await callRoute({ GET: cast }, { path: '/x' });

      expect(result.status).toBe(400);
      expect(JSON.stringify(result.body)).not.toContain('not-an-id');
    });

    it('rethrows a redirect untouched instead of turning it into a 500', async () => {
      const moving = withApi(
        async () => {
          redirect('/');
        },
        { access: 'public' },
      );

      const outcome = await callRoute({ GET: moving }, { path: '/x' }).catch(
        (error: unknown) => error,
      );

      const digest = (outcome as { digest?: unknown }).digest;
      expect(String(digest).startsWith('NEXT_REDIRECT')).toBe(true);
    });

    it('keeps the headers of a handler response and still adds the request ID', async () => {
      const custom = withApi(
        async () => ok({}, { headers: { 'cache-control': 'no-store' } }),
        { access: 'public' },
      );

      const result = await callRoute({ GET: custom }, { path: '/x' });

      expect(result.headers.get('cache-control')).toBe('no-store');
      expect(UUID.test(result.headers.get('x-request-id') ?? '')).toBe(true);
    });

    it('adds the request ID to a response whose headers are read-only', async () => {
      const frozen = withApi(
        async () => Response.redirect(`${APP}/there`, 302),
        {
          access: 'public',
        },
      );

      const result = await callRoute({ GET: frozen }, { path: '/x' });

      expect(result.status).toBe(302);
      expect(UUID.test(result.headers.get('x-request-id') ?? '')).toBe(true);
    });
  });
});
