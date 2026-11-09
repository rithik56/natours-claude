import { Types } from 'mongoose';
import { notFound, redirect } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { messages } from '@/lib/messages';
import type { Access } from '@/server/access';
import { action } from '@/server/actions/action';
import type { ActionResult, ActionState } from '@/server/actions/action-state';
import { AppError } from '@/server/errors';
import { toSelf, type SelfUser } from '@/server/modules/users/dto';
import { User } from '@/server/modules/users/model';
import * as usersService from '@/server/modules/users/service';
import { z } from '@/server/validation';
import { useTestDatabase } from '../../helpers/db';
import { createUser } from '../../helpers/factories';
import { mockSession } from '../../helpers/mock-session';
import { requestHeaders } from '../../helpers/request-context';

const logged = vi.hoisted(() => ({ lines: [] as Record<string, unknown>[] }));

// Every line the app logs lands in logged.lines, so tests can read what an action wrote.
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
const WARN = 40;
const ERROR = 50;

const profileSchema = z.strictObject({
  email: z.email(),
  name: z.string().min(2),
});
type Profile = z.infer<typeof profileSchema>;
type Context = { user: SelfUser | null; requestId: string; log: unknown };
type Handler = (
  input: Profile,
  context: Context,
) => Promise<ActionResult<unknown> | void>;

const handler = vi.fn<Handler>(async () => ({
  message: 'Your details are saved.',
}));
const previous: ActionState<unknown> = { ok: true };

function build(access: Access | undefined, options: object = {}) {
  return action(
    profileSchema,
    handler as never,
    {
      access,
      ...options,
    } as never,
  ) as (
    prev: ActionState<unknown>,
    formData: FormData,
  ) => Promise<ActionState<unknown>>;
}

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      data.append(name, item);
    }
  }
  return data;
}

function profileOf(person: { email: string; name: string }): FormData {
  return form({ email: person.email, name: person.name });
}

type Settled<T> =
  { status: 'resolved'; value: T } | { status: 'rejected'; reason: unknown };

async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { status: 'resolved', value: await promise };
  } catch (reason) {
    return { status: 'rejected', reason };
  }
}

function digestOf(outcome: Settled<unknown>): string {
  if (outcome.status !== 'rejected') return '';
  const reason = outcome.reason;
  if (typeof reason === 'object' && reason !== null && 'digest' in reason) {
    return typeof reason.digest === 'string' ? reason.digest : '';
  }
  return '';
}

function errorOf(state: ActionState<unknown>) {
  return state.ok ? undefined : state.error;
}

function linesAtOrAbove(level: number) {
  return logged.lines.filter((line) => Number(line.level) >= level);
}

beforeEach(() => {
  handler.mockReset();
  handler.mockImplementation(async () => ({
    message: 'Your details are saved.',
  }));
  logged.lines.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('action()', () => {
  useTestDatabase();

  describe('redirect and notFound pass through (B18)', () => {
    it('[B18] a redirect() inside the handler reaches the caller with its NEXT_REDIRECT digest', async () => {
      const { user } = await createUser({ role: 'user' });
      await mockSession(user);
      handler.mockImplementation(async () => redirect('/me'));

      const outcome = await settle(build('auth')(previous, profileOf(user)));

      expect(outcome.status).toBe('rejected');
      expect(digestOf(outcome).startsWith('NEXT_REDIRECT;')).toBe(true);
      expect(digestOf(outcome).includes(';/me;')).toBe(true);
    });

    it('[B18] a notFound() inside the handler reaches the caller with the 404 digest', async () => {
      const { user } = await createUser({ role: 'user' });
      await mockSession(user);
      handler.mockImplementation(async () => notFound());

      const outcome = await settle(build('auth')(previous, profileOf(user)));

      expect(outcome.status).toBe('rejected');
      expect(digestOf(outcome)).toBe('NEXT_HTTP_ERROR_FALLBACK;404');
    });

    it('[B18] a redirect() is not logged as a failure and does not become an ActionState', async () => {
      const { user } = await createUser({ role: 'user' });
      await mockSession(user);
      handler.mockImplementation(async () => redirect('/me'));

      const outcome = await settle(build('auth')(previous, profileOf(user)));

      expect(outcome.status).toBe('rejected');
      expect(linesAtOrAbove(WARN).length).toBe(0);
    });

    it('[B18] a notFound() is not logged as a failure either', async () => {
      const { user } = await createUser({ role: 'user' });
      await mockSession(user);
      handler.mockImplementation(async () => notFound());

      const outcome = await settle(build('auth')(previous, profileOf(user)));

      expect(outcome.status).toBe('rejected');
      expect(linesAtOrAbove(WARN).length).toBe(0);
    });

    it('[B18] a redirect() from a public action passes through too', async () => {
      const { user } = await createUser({ role: 'user' });
      handler.mockImplementation(async () => redirect('/login'));

      const outcome = await settle(build('public')(previous, profileOf(user)));

      expect(outcome.status).toBe('rejected');
      expect(digestOf(outcome).startsWith('NEXT_REDIRECT;')).toBe(true);
    });
  });

  describe('default-deny access (S1)', () => {
    it('[S1] resolves to FORBIDDEN and never runs the handler when no options are given', async () => {
      const { user: admin } = await createUser({ role: 'admin' });
      await mockSession(admin);
      const run = action(
        profileSchema,
        handler as never,
        undefined as never,
      ) as ReturnType<typeof build>;

      const state = await run(previous, profileOf(admin));

      expect(errorOf(state)?.code).toBe('FORBIDDEN');
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] resolves to FORBIDDEN when the access declaration is missing, even for an admin', async () => {
      const { user: admin } = await createUser({ role: 'admin' });
      await mockSession(admin);

      const state = await build(undefined)(previous, profileOf(admin));

      expect(errorOf(state)?.code).toBe('FORBIDDEN');
      expect(errorOf(state)?.message).toBe(messages.errors.FORBIDDEN);
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] resolves to FORBIDDEN for an access value it does not know', async () => {
      const { user: admin } = await createUser({ role: 'admin' });
      await mockSession(admin);

      for (const bad of ['admin', 'anyone', '', null, 7, { roles: 'admin' }]) {
        const state = await build(bad as never)(previous, profileOf(admin));
        expect(errorOf(state)?.code).toBe('FORBIDDEN');
      }
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] a public action runs for an anonymous visitor with a null user', async () => {
      const { user } = await createUser({ role: 'user' });

      const state = await build('public')(previous, profileOf(user));

      expect(state.ok).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]?.[1].user).toBeNull();
    });

    it('[S1] an auth action gives an anonymous caller UNAUTHENTICATED and runs for a signed-in user', async () => {
      const { user } = await createUser({ role: 'user' });

      const anonymous = await build('auth')(previous, profileOf(user));
      await mockSession(user);
      const signedIn = await build('auth')(previous, profileOf(user));

      expect(errorOf(anonymous)?.code).toBe('UNAUTHENTICATED');
      expect(signedIn.ok).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]?.[1].user?.id).toBe(String(user._id));
    });

    it('[S1] an owner action needs a signed-in user, like an auth action', async () => {
      const { user } = await createUser({ role: 'user' });

      const anonymous = await build('owner')(previous, profileOf(user));
      await mockSession(user);
      const signedIn = await build('owner')(previous, profileOf(user));

      expect(errorOf(anonymous)?.code).toBe('UNAUTHENTICATED');
      expect(signedIn.ok).toBe(true);
    });

    it('[S1] a deactivated account is UNAUTHENTICATED even with a valid cookie', async () => {
      const { user } = await createUser({ role: 'user', active: false });
      await mockSession(user);

      const state = await build('auth')(previous, profileOf(user));

      expect(errorOf(state)?.code).toBe('UNAUTHENTICATED');
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] a role list refuses a guide with FORBIDDEN and admits an admin', async () => {
      const { user: guide } = await createUser({ role: 'guide' });
      const { user: admin } = await createUser({ role: 'admin' });
      const adminOnly = build({ roles: ['admin'] });

      await mockSession(guide);
      const refused = await adminOnly(previous, profileOf(guide));
      await mockSession(admin);
      const admitted = await adminOnly(previous, profileOf(admin));

      expect(errorOf(refused)?.code).toBe('FORBIDDEN');
      expect(admitted.ok).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('[S1] an admin is refused on a list that leaves admin out: no role hierarchy', async () => {
      const { user: admin } = await createUser({ role: 'admin' });
      await mockSession(admin);

      const state = await build({ roles: ['guide', 'lead-guide'] })(
        previous,
        profileOf(admin),
      );

      expect(errorOf(state)?.code).toBe('FORBIDDEN');
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] an empty role list admits nobody, not even an admin', async () => {
      const { user: admin } = await createUser({ role: 'admin' });
      await mockSession(admin);

      const state = await build({ roles: [] })(previous, profileOf(admin));

      expect(errorOf(state)?.code).toBe('FORBIDDEN');
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] a role list gives an anonymous caller UNAUTHENTICATED, not FORBIDDEN', async () => {
      const { user } = await createUser({ role: 'user' });

      const state = await build({ roles: ['admin'] })(
        previous,
        profileOf(user),
      );

      expect(errorOf(state)?.code).toBe('UNAUTHENTICATED');
    });

    it('[S1] a database outage while reading the user is SERVICE_UNAVAILABLE, not a logged-out visitor', async () => {
      const { user } = await createUser({ role: 'user' });
      await mockSession(user);
      vi.spyOn(usersService, 'findActiveById').mockRejectedValue(
        new AppError('SERVICE_UNAVAILABLE'),
      );

      const state = await build('auth')(previous, profileOf(user));

      expect(errorOf(state)?.code).toBe('SERVICE_UNAVAILABLE');
      expect(handler).not.toHaveBeenCalled();
    });

    it('[S1] access is checked before the form: an anonymous caller with a bad form gets UNAUTHENTICATED, not field errors', async () => {
      const state = await build('auth')(previous, form({ unexpected: 'x' }));

      expect(errorOf(state)?.code).toBe('UNAUTHENTICATED');
      expect(errorOf(state)?.fieldErrors).toBeUndefined();
    });

    it('[S1] access is checked before the rate limit: refused calls do not use the allowance', async () => {
      const { user } = await createUser({ role: 'user' });
      const limited = build('auth', {
        rateLimit: {
          rule: { name: 'access-first', points: 1, durationSeconds: 60 },
          key: () => 'shared',
        },
      });

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const anonymous = await limited(previous, profileOf(user));
        expect(errorOf(anonymous)?.code).toBe('UNAUTHENTICATED');
      }
      await mockSession(user);
      const signedIn = await limited(previous, profileOf(user));

      expect(signedIn.ok).toBe(true);
    });
  });

  describe('form validation and field errors (B9)', () => {
    it('[B9] a missing field gives VALIDATION_ERROR with the required message from messages.ts', async () => {
      const { user } = await createUser({ role: 'user' });

      const state = await build('public')(previous, form({ name: user.name }));

      const error = errorOf(state);
      expect(error?.code).toBe('VALIDATION_ERROR');
      expect(error?.message).toBe(messages.errors.VALIDATION_ERROR);
      expect(error?.fieldErrors?.email).toBe(messages.validation.required);
      expect(handler).not.toHaveBeenCalled();
    });

    it('[B9] an invalid email and a short name each get their own message, in Indian English from messages.ts', async () => {
      const state = await build('public')(
        previous,
        form({ email: 'not-an-email', name: 'A' }),
      );

      const fields = errorOf(state)?.fieldErrors;
      expect(fields?.email).toBe(messages.validation.invalidEmail);
      expect(fields?.name).toBe(messages.validation.tooShort(2));
    });

    it('[B9] no field error is Zod English', async () => {
      const state = await build('public')(
        previous,
        form({ email: 'x', name: '' }),
      );

      const fields = errorOf(state)?.fieldErrors ?? {};
      expect(Object.keys(fields).sort()).toEqual(['email', 'name']);
      const text = JSON.stringify(fields);
      expect(text.includes('Invalid')).toBe(false);
      expect(text.includes('expected')).toBe(false);
      expect(text.includes('Too small')).toBe(false);
    });

    it('[B9] an extra field under z.strictObject gives VALIDATION_ERROR and the handler does not run', async () => {
      const { user } = await createUser({ role: 'user' });

      const state = await build('public')(
        previous,
        form({ email: user.email, name: user.name, role: 'admin' }),
      );

      expect(errorOf(state)?.code).toBe('VALIDATION_ERROR');
      expect(handler).not.toHaveBeenCalled();
    });

    it('[B9] Next internal $ACTION fields are stripped before validation', async () => {
      const { user } = await createUser({ role: 'user' });
      const data = profileOf(user);
      data.append('$ACTION_ID_abc', '');
      data.append('$ACTION_REF_1', '');
      data.append('$ACTION_1:0', '[]');
      data.append('$ACTION_KEY', 'k');

      const state = await build('public')(previous, data);

      expect(state.ok).toBe(true);
      expect(handler.mock.calls[0]?.[0]).toEqual({
        email: user.email,
        name: user.name,
      });
    });

    it('[B9] repeated fields become an array and a single field stays a string', async () => {
      const seen = vi.fn<(input: unknown) => Promise<void>>(async () => {});
      const schema = z.strictObject({
        difficulty: z.array(z.string()),
        name: z.string(),
      });
      const run = action(
        schema,
        (async (input: unknown) => {
          await seen(input);
        }) as never,
        { access: 'public' } as never,
      ) as ReturnType<typeof build>;

      const state = await run(
        previous,
        form({ difficulty: ['easy', 'medium'], name: 'Spiti' }),
      );

      expect(state.ok).toBe(true);
      expect(seen.mock.calls[0]?.[0]).toEqual({
        difficulty: ['easy', 'medium'],
        name: 'Spiti',
      });
    });

    it('[B9] a __proto__ field cannot change the prototype of the parsed input', async () => {
      const { user } = await createUser({ role: 'user' });
      const data = profileOf(user);
      data.append('__proto__', 'a');
      data.append('__proto__', 'b');

      const state = await build('public')(previous, data);

      expect(errorOf(state)?.code).toBe('VALIDATION_ERROR');
      expect(handler).not.toHaveBeenCalled();
    });

    it('[B9] the form values never reach the logs', async () => {
      const { user } = await createUser({ role: 'user' });

      const state = await build('public')(
        previous,
        form({ email: user.email, name: 'A' }),
      );

      expect(errorOf(state)?.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(logged.lines).includes(user.email)).toBe(false);
    });
  });

  describe('expected and unexpected errors (B9)', () => {
    it('[B9] a CONFLICT with a field detail comes back as a field error on email', async () => {
      const { user } = await createUser({ role: 'user' });
      const message = messages.errors.CONFLICT;
      handler.mockImplementation(async () => {
        throw new AppError('CONFLICT', undefined, [{ path: 'email', message }]);
      });

      const state = await build('public')(previous, profileOf(user));

      expect(state).toEqual({
        ok: false,
        error: { code: 'CONFLICT', message, fieldErrors: { email: message } },
      });
    });

    it('[B9] a duplicate key from the database is a CONFLICT field error that leaks no driver text or value', async () => {
      const { user } = await createUser({ role: 'user' });
      handler.mockImplementation(async () => {
        throw Object.assign(
          new Error(
            `E11000 duplicate key error collection: natours.users index: email_1 dup key: { email: "${user.email}" }`,
          ),
          { code: 11000, keyPattern: { email: 1 } },
        );
      });

      const state = await build('public')(previous, profileOf(user));

      expect(errorOf(state)?.code).toBe('CONFLICT');
      expect(errorOf(state)?.fieldErrors?.email).toBe(messages.errors.CONFLICT);
      const text = JSON.stringify(state);
      expect(text.includes('E11000')).toBe(false);
      expect(text.includes(user.email)).toBe(false);
    });

    it('[B9] NOT_FOUND, RATE_LIMITED and SERVICE_UNAVAILABLE from the handler come back as ActionState', async () => {
      const { user } = await createUser({ role: 'user' });
      for (const code of [
        'NOT_FOUND',
        'RATE_LIMITED',
        'SERVICE_UNAVAILABLE',
      ] as const) {
        handler.mockImplementation(async () => {
          throw new AppError(code);
        });

        const state = await build('public')(previous, profileOf(user));

        expect(errorOf(state)?.code).toBe(code);
        expect(errorOf(state)?.message).toBe(messages.errors[code]);
      }
    });

    it('[B9] an expected refusal is logged as a warning with the request ID, an outage as an error', async () => {
      const { user } = await createUser({ role: 'user' });
      const requestId = requestHeaders.get('x-request-id');
      handler.mockImplementation(async () => {
        throw new AppError('NOT_FOUND');
      });
      await build('public')(previous, profileOf(user));
      const warnings = logged.lines.filter(
        (line) => Number(line.level) === WARN,
      );

      handler.mockImplementation(async () => {
        throw new AppError('SERVICE_UNAVAILABLE');
      });
      await build('public')(previous, profileOf(user));
      const errors = logged.lines.filter(
        (line) => Number(line.level) === ERROR,
      );

      expect(warnings.length).toBe(1);
      expect(warnings[0]?.requestId).toBe(requestId);
      expect(errors.length).toBe(1);
      expect(errors[0]?.requestId).toBe(requestId);
    });

    it('[B9] an unexpected error is rethrown as it is, not turned into an ActionState', async () => {
      const { user } = await createUser({ role: 'user' });
      const boom = new Error('boom');
      handler.mockImplementation(async () => {
        throw boom;
      });

      const outcome = await settle(build('public')(previous, profileOf(user)));

      expect(outcome.status).toBe('rejected');
      expect(outcome.status === 'rejected' && outcome.reason === boom).toBe(
        true,
      );
    });

    it('[B9] an unexpected error is logged once at error level with the request ID and no form values', async () => {
      const { user } = await createUser({ role: 'user' });
      const requestId = requestHeaders.get('x-request-id');
      handler.mockImplementation(async () => {
        throw new Error('boom');
      });

      await settle(build('public')(previous, profileOf(user)));

      const errors = logged.lines.filter(
        (line) => Number(line.level) === ERROR,
      );
      expect(errors.length).toBe(1);
      expect(errors[0]?.requestId).toBe(requestId);
      expect(JSON.stringify(logged.lines).includes(user.email)).toBe(false);
    });

    it('[B9] a Zod error thrown by the handler comes back as VALIDATION_ERROR field errors', async () => {
      const { user } = await createUser({ role: 'user' });
      handler.mockImplementation(async () => {
        z.strictObject({ name: z.string().min(5) }).parse({ name: 'ab' });
      });

      const state = await build('public')(previous, profileOf(user));

      expect(errorOf(state)?.code).toBe('VALIDATION_ERROR');
      expect(errorOf(state)?.fieldErrors?.name).toBe(
        messages.validation.tooShort(5),
      );
    });
  });

  describe('request ID (D7)', () => {
    it('[B9] the handler gets the request ID set by proxy.ts and logs with it', async () => {
      const { user } = await createUser({ role: 'user' });
      const requestId = crypto.randomUUID();
      requestHeaders.set('x-request-id', requestId);
      handler.mockImplementation(async (_input, context) => {
        (context.log as { info: (fields: object, text: string) => void }).info(
          { step: 'handler' },
          'inside the action',
        );
      });

      await build('public')(previous, profileOf(user));

      expect(handler.mock.calls[0]?.[1].requestId).toBe(requestId);
      const line = logged.lines.find((entry) => entry.step === 'handler');
      expect(line?.requestId).toBe(requestId);
    });

    it('[B9] a header that is not a UUID is replaced, so it cannot forge a log line', async () => {
      const { user } = await createUser({ role: 'user' });
      requestHeaders.set('x-request-id', 'forged-id');

      await build('public')(previous, profileOf(user));

      const received = handler.mock.calls[0]?.[1].requestId ?? '';
      expect(UUID.test(received)).toBe(true);
      expect(received).not.toBe('forged-id');
    });
  });

  describe('plain data only (R6)', () => {
    it('[R6] a hydrated User document in data is refused, not sent to the browser', async () => {
      const { user } = await createUser({ role: 'user' });
      const document = await User.findById(user._id);
      handler.mockImplementation(async () => ({ data: document }));

      const outcome = await settle(build('public')(previous, profileOf(user)));

      expect(outcome.status).toBe('rejected');
    });

    it('[R6] a refused document leaks neither its fields nor the email through the error', async () => {
      const { user } = await createUser({ role: 'user' });
      const document = await User.findById(user._id);
      handler.mockImplementation(async () => ({ data: document }));

      const outcome = await settle(build('public')(previous, profileOf(user)));

      const reason = outcome.status === 'rejected' ? outcome.reason : null;
      const text = `${String(reason)} ${JSON.stringify(logged.lines)}`;
      expect(text.includes(user.email)).toBe(false);
      expect(text.includes('data')).toBe(true);
    });

    it.each([
      ['a Date', () => ({ when: new Date() })],
      ['an ObjectId', () => ({ id: new Types.ObjectId() })],
      ['a Map', () => ({ entries: new Map([['a', 1]]) })],
      ['a function', () => ({ run: () => 1 })],
      [
        'a class instance',
        () => ({
          person: new (class Person {
            name = 'x';
          })(),
        }),
      ],
      ['a bigint', () => ({ big: BigInt(10) })],
      ['a Date inside an array', () => ({ list: [{ when: new Date() }] })],
    ])('[R6] %s in data is refused', async (_label, make) => {
      const { user } = await createUser({ role: 'user' });
      handler.mockImplementation(async () => ({ data: make() }));

      const outcome = await settle(build('public')(previous, profileOf(user)));

      expect(outcome.status).toBe('rejected');
    });

    it('[R6] a circular structure in data is refused', async () => {
      const { user } = await createUser({ role: 'user' });
      const loop: Record<string, unknown> = { name: user.name };
      loop.self = loop;
      handler.mockImplementation(async () => ({ data: loop }));

      const outcome = await settle(build('public')(previous, profileOf(user)));

      expect(outcome.status).toBe('rejected');
    });

    it('[R6] a DTO with a message resolves to { ok: true, data, message }', async () => {
      const { user } = await createUser({ role: 'user' });
      const document = await User.findById(user._id);
      const dto = toSelf(document ?? user);
      handler.mockImplementation(async () => ({
        data: dto,
        message: 'Your details are saved.',
      }));

      const state = await build('public')(previous, profileOf(user));

      expect(state).toEqual({
        ok: true,
        data: dto,
        message: 'Your details are saved.',
      });
      expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    });

    it('[R6] primitives, nested arrays and null-prototype objects are plain data', async () => {
      const { user } = await createUser({ role: 'user' });
      const bare = Object.assign(Object.create(null) as object, { n: 1 });
      const data = { list: [1, 'a', true, null, [{ deep: bare }]], none: null };
      handler.mockImplementation(async () => ({ data }));

      const state = await build('public')(previous, profileOf(user));

      expect(state.ok).toBe(true);
    });

    it('[R6] a handler that returns nothing resolves to exactly { ok: true }', async () => {
      const { user } = await createUser({ role: 'user' });
      handler.mockImplementation(async () => {});

      const state = await build('public')(previous, profileOf(user));

      expect(state).toEqual({ ok: true });
    });
  });

  describe('rate limit', () => {
    it('[S1] the second call within the window is RATE_LIMITED with the wait time, and the handler does not run again', async () => {
      const { user } = await createUser({ role: 'user' });
      const limited = build('public', {
        rateLimit: {
          rule: { name: 'probe', points: 1, durationSeconds: 60 },
          key: () => 'k',
        },
      });

      const first = await limited(previous, profileOf(user));
      const second = await limited(previous, profileOf(user));

      expect(first.ok).toBe(true);
      const error = errorOf(second);
      expect(error?.code).toBe('RATE_LIMITED');
      expect(error?.message).toBe(messages.errors.RATE_LIMITED);
      const wait = error?.retryAfterSeconds ?? 0;
      expect(wait > 0 && wait <= 60).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('[S1] the key is built from the validated input, so another key has its own allowance', async () => {
      const { user: first } = await createUser({ role: 'user' });
      const { user: second } = await createUser({ role: 'user' });
      const limited = build('public', {
        rateLimit: {
          rule: { name: 'per-email', points: 1, durationSeconds: 60 },
          key: (input: Profile) => input.email,
        },
      });

      await limited(previous, profileOf(first));
      const again = await limited(previous, profileOf(first));
      const other = await limited(previous, profileOf(second));

      expect(errorOf(again)?.code).toBe('RATE_LIMITED');
      expect(other.ok).toBe(true);
    });

    it('[S1] a form that fails validation does not use the allowance', async () => {
      const { user } = await createUser({ role: 'user' });
      const limited = build('public', {
        rateLimit: {
          rule: { name: 'after-validation', points: 1, durationSeconds: 60 },
          key: () => 'k',
        },
      });

      const invalid = await limited(previous, form({ email: 'x' }));
      await limited(previous, form({ email: 'x' }));
      const valid = await limited(previous, profileOf(user));

      expect(errorOf(invalid)?.code).toBe('VALIDATION_ERROR');
      expect(valid.ok).toBe(true);
    });
  });

  describe('useActionState shape', () => {
    it('[B18] the returned function takes (prev, formData) and returns a promise of ActionState', async () => {
      const { user } = await createUser({ role: 'user' });
      const run = build('public');

      const result = run(previous, profileOf(user));

      expect(typeof run).toBe('function');
      expect(run.length).toBe(2);
      expect(result instanceof Promise).toBe(true);
      expect((await result).ok).toBe(true);
    });
  });
});
