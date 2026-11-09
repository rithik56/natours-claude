import { SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError, isAppError } from '@/server/errors';
import { User } from '@/server/modules/users/model';
import * as usersService from '@/server/modules/users/service';
import type { Role } from '@/server/roles';
import {
  SESSION_COOKIE,
  getCurrentUser,
  getSession,
  requireRole,
  requireUser,
  signSession,
} from '@/server/session';
import { useTestDatabase } from '../helpers/db';
import { createUser } from '../helpers/factories';
import { mockSession } from '../helpers/mock-session';
import { cookieStore } from '../helpers/request-context';

const SECRET = process.env.SESSION_SECRET ?? '';
const key = (secret: string) => new TextEncoder().encode(secret);
const OTHER_SECRET = 'another-secret-of-at-least-32-characters-0123';
const CHANGE_TIME = new Date('2026-11-08T10:00:00.700+05:30');

// Pins only Date: Mongo and jose both keep working (QA-20).
function clockAt(iso: string): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}

// Joins the outcome into one value so a failing assertion prints on one line.
async function outcome(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'resolved';
  } catch (error) {
    if (isAppError(error)) return error.code;
    const digest = (error as { digest?: unknown }).digest;
    return typeof digest === 'string' ? digest : 'other error';
  }
}

describe('current user', () => {
  useTestDatabase();

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('getCurrentUser', () => {
    it('[S14] gives the logged-in user when the cookie comes from next/headers', async () => {
      const { user } = await createUser({ role: 'user' });
      await mockSession(user);

      const current = await getCurrentUser();

      expect(current?.id).toBe(String(user._id));
      expect(current?.email).toBe(user.email);
    });

    it('[S14] reads the cookie from a given source, as Route Handlers do with request.cookies', async () => {
      const { user } = await createUser({ role: 'user' });
      const token = await signSession(String(user._id));
      const source = {
        get: (name: string) =>
          name === SESSION_COOKIE ? { value: token } : undefined,
      };

      expect((await getCurrentUser(source))?.id).toBe(String(user._id));
    });

    it('[S14] gives null with no session cookie', async () => {
      const { user } = await createUser();
      await mockSession(user);
      expect(await getCurrentUser()).not.toBeNull();

      await mockSession(null);

      expect(await getCurrentUser()).toBeNull();
    });

    it('[S3] returns exactly id, name, email, role and photo', async () => {
      const { user } = await createUser({ role: 'guide' });
      await mockSession(user);

      const current = await getCurrentUser();

      expect(Object.keys(current ?? {}).sort()).toEqual([
        'email',
        'id',
        'name',
        'photo',
        'role',
      ]);
    });

    it('[S14] reads the role from the database on every call', async () => {
      const { user } = await createUser({ role: 'user' });
      await mockSession(user);
      expect((await getCurrentUser())?.role).toBe('user');

      await User.collection.updateOne(
        { _id: user._id },
        { $set: { role: 'admin' } },
      );

      expect((await getCurrentUser())?.role).toBe('admin');
    });

    it('[S14] ignores a role claim inside the token and uses the database role', async () => {
      const { user } = await createUser({ role: 'user' });
      const forged = await new SignJWT({ role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(String(user._id))
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(key(SECRET));
      cookieStore.set(SESSION_COOKIE, forged);

      const current = await getCurrentUser();

      expect(current?.id).toBe(String(user._id));
      expect(current?.role).toBe('user');
    });

    it('[S6] gives null once the user is deactivated', async () => {
      const { user } = await createUser();
      await mockSession(user);
      expect(await getCurrentUser()).not.toBeNull();

      await User.collection.updateOne(
        { _id: user._id },
        { $set: { active: false } },
      );

      expect(await getCurrentUser()).toBeNull();
    });

    it('[S6] gives null once the user is deleted', async () => {
      const { user } = await createUser();
      await mockSession(user);
      expect(await getCurrentUser()).not.toBeNull();

      await User.deleteOne({ _id: user._id });

      expect(await getCurrentUser()).toBeNull();
    });

    it('[S6] gives null for a signed token whose subject is not a user id', async () => {
      await createUser();
      cookieStore.set(SESSION_COOKIE, await signSession('not-an-object-id'));

      expect(await getCurrentUser()).toBeNull();
    });

    it('[S14] gives null for a token older than 7 days', async () => {
      const { user } = await createUser();
      clockAt('2026-11-08T10:00:00+05:30');
      await mockSession(user);
      expect(await getCurrentUser()).not.toBeNull();

      clockAt('2026-11-15T10:00:01+05:30');

      expect(await getCurrentUser()).toBeNull();
    });

    it('[S14] gives null for an HS512 token, an unsigned token and a token from another secret', async () => {
      const { user } = await createUser();
      const id = String(user._id);
      const issued = Math.floor(Date.now() / 1000);
      const claims = { sub: id, iat: issued, exp: issued + 3600 };
      const asBase64 = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString('base64url');
      const signed = (alg: string, secret: string) =>
        new SignJWT({})
          .setProtectedHeader({ alg })
          .setSubject(id)
          .setIssuedAt()
          .setExpirationTime('7d')
          .sign(key(secret));

      cookieStore.set(SESSION_COOKIE, await signed('HS256', SECRET));
      expect(await getCurrentUser()).not.toBeNull();

      const forgeries = {
        hs512: await signed('HS512', SECRET),
        none: `${asBase64({ alg: 'none', typ: 'JWT' })}.${asBase64(claims)}.`,
        otherSecret: await signed('HS256', OTHER_SECRET),
      };
      const results: Record<string, boolean> = {};
      for (const [name, token] of Object.entries(forgeries)) {
        cookieStore.set(SESSION_COOKIE, token);
        results[name] = (await getCurrentUser()) === null;
      }

      expect(results).toEqual({ hs512: true, none: true, otherSecret: true });
    });

    it('[S6] passes a database outage on instead of treating the visitor as logged out', async () => {
      const { user } = await createUser();
      await mockSession(user);
      vi.spyOn(usersService, 'findActiveById').mockRejectedValue(
        new AppError('SERVICE_UNAVAILABLE'),
      );

      expect(await outcome(getCurrentUser())).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('a token and a password change (SEC-18)', () => {
    it('[S14] accepts a token issued in the same second as the password change', async () => {
      clockAt('2026-11-08T10:00:00.000+05:30');
      const { user } = await createUser();
      await mockSession(user);

      vi.setSystemTime(CHANGE_TIME);
      const loaded = await User.findById(user._id).select('+password');
      loaded!.password = 'A-different-passphrase-2027';
      await loaded!.save();
      const stored = await User.findById(user._id);

      expect(stored?.passwordChangedAt?.toISOString()).toBe(
        CHANGE_TIME.toISOString(),
      );
      expect((await getCurrentUser())?.id).toBe(String(user._id));
    });

    it('[S14] rejects a token issued one second before the second of the change', async () => {
      clockAt('2026-11-08T09:59:59.000+05:30');
      const { user } = await createUser({ passwordChangedAt: CHANGE_TIME });
      await mockSession(user);
      const session = await getSession();
      expect(session?.iat).toBe(Math.floor(CHANGE_TIME.getTime() / 1000) - 1);

      expect(await getCurrentUser()).toBeNull();

      clockAt('2026-11-08T10:00:00.800+05:30');
      await mockSession(user);
      expect((await getCurrentUser())?.id).toBe(String(user._id));
    });

    it('[S14] accepts a token issued in the second after the change', async () => {
      clockAt('2026-11-08T10:00:01.000+05:30');
      const { user } = await createUser({ passwordChangedAt: CHANGE_TIME });
      await mockSession(user);

      expect((await getCurrentUser())?.id).toBe(String(user._id));
    });

    it('[S14] accepts a token from the same second even when the change is later in that second', async () => {
      clockAt('2026-11-08T10:00:00.000+05:30');
      const { user } = await createUser({
        passwordChangedAt: new Date('2026-11-08T10:00:00.999+05:30'),
      });
      await mockSession(user);

      expect((await getCurrentUser())?.id).toBe(String(user._id));
    });

    it('[S14] rejects a token issued long before the password change', async () => {
      clockAt('2026-11-01T10:00:00+05:30');
      const { user } = await createUser();
      await mockSession(user);
      expect(await getCurrentUser()).not.toBeNull();

      clockAt('2026-11-08T10:00:00+05:30');
      const loaded = await User.findById(user._id).select('+password');
      loaded!.password = 'A-different-passphrase-2027';
      await loaded!.save();

      expect(await getCurrentUser()).toBeNull();

      clockAt('2026-11-08T10:00:01+05:30');
      await mockSession(user);
      expect((await getCurrentUser())?.id).toBe(String(user._id));
    });
  });

  describe('requireUser', () => {
    it('[S6] returns the user when logged in', async () => {
      const { user } = await createUser({ role: 'guide' });
      await mockSession(user);

      expect((await requireUser()).id).toBe(String(user._id));
    });

    it('[S6] throws UNAUTHENTICATED with no session', async () => {
      expect(await outcome(requireUser())).toBe('UNAUTHENTICATED');
    });

    it('[S6] throws UNAUTHENTICATED for a deactivated user', async () => {
      const { user } = await createUser();
      await mockSession(user);
      await User.collection.updateOne(
        { _id: user._id },
        { $set: { active: false } },
      );

      expect(await outcome(requireUser())).toBe('UNAUTHENTICATED');
    });

    it('[S22] redirects to the login page, keeping a safe next path', async () => {
      expect(await outcome(requireUser({ next: '/me' }))).toContain(
        '/login?next=%2Fme',
      );
    });

    it('[S22] does not carry an unsafe next path to the login page', async () => {
      const result = await outcome(requireUser({ next: '//evil.example' }));

      expect(result).toContain('/login?next=%2F;');
      expect(result).not.toContain('evil');
    });
  });

  describe('requireRole', () => {
    it('[S6] returns the user when the role is listed', async () => {
      const { user } = await createUser({ role: 'admin' });
      await mockSession(user);

      expect((await requireRole(['admin'])).role).toBe('admin');
    });

    it('[S6] throws FORBIDDEN for a lead-guide when only admin is listed', async () => {
      const { user } = await createUser({ role: 'lead-guide' });
      await mockSession(user);

      expect(await outcome(requireRole(['admin']))).toBe('FORBIDDEN');
    });

    it.each<[Role, Role[]]>([
      ['lead-guide', ['guide']],
      ['admin', ['guide', 'lead-guide']],
      ['user', ['guide']],
    ])(
      '[S6] has no role hierarchy: %s is refused when only %j are listed',
      async (role, listed) => {
        const { user } = await createUser({ role });
        await mockSession(user);

        expect(await outcome(requireRole(listed))).toBe('FORBIDDEN');
      },
    );

    it('[S6] throws UNAUTHENTICATED with no session', async () => {
      expect(await outcome(requireRole(['admin']))).toBe('UNAUTHENTICATED');
    });

    it('[S6] checks the database role, so a demoted admin is refused at once', async () => {
      const { user } = await createUser({ role: 'admin' });
      await mockSession(user);
      expect((await requireRole(['admin'])).role).toBe('admin');

      await User.collection.updateOne(
        { _id: user._id },
        { $set: { role: 'user' } },
      );

      expect(await outcome(requireRole(['admin']))).toBe('FORBIDDEN');
    });
  });
});
