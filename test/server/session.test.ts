import { SignJWT, decodeJwt, decodeProtectedHeader } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  expiredSessionCookie,
  getSession,
  sessionCookie,
  sessionCookieOptions,
  signSession,
  type CookieReader,
} from '@/server/session';
import { seedUsers } from '../helpers/seed';

function seedId(index: number): string {
  const person = seedUsers()[index];
  if (!person) throw new Error(`seed/data/users.json has no person ${index}`);
  return person._id;
}

const userId = seedId(0);
const SECRET = process.env.SESSION_SECRET ?? '';
const key = (secret: string) => new TextEncoder().encode(secret);
const OTHER_SECRET = 'another-secret-of-at-least-32-characters-0123';
const NOW = new Date('2026-11-08T10:00:00+05:30');
const DAY_MS = 24 * 60 * 60 * 1000;

function reader(token: string | undefined): CookieReader {
  return {
    get: (name) =>
      name === SESSION_COOKIE && token !== undefined
        ? { value: token }
        : undefined,
  };
}

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

// A well-formed token that differs from signSession in one way only.
function builder(alg = 'HS256') {
  return new SignJWT({})
    .setProtectedHeader({ alg })
    .setSubject(userId)
    .setIssuedAt();
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('signSession', () => {
  it('[S14] signs with HS256 and carries only sub, iat and exp', async () => {
    const token = await signSession(userId);

    expect(decodeProtectedHeader(token).alg).toBe('HS256');
    expect(Object.keys(decodeJwt(token)).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(decodeJwt(token).sub).toBe(userId);
  });

  it('[S14] expires after exactly the cookie maxAge, 7 days', async () => {
    const { exp, iat } = decodeJwt(await signSession(userId));

    expect((exp ?? 0) - (iat ?? 0)).toBe(604800);
    expect(SESSION_MAX_AGE_SECONDS).toBe(604800);
    expect(sessionCookieOptions().maxAge).toBe((exp ?? 0) - (iat ?? 0));
  });
});

describe('getSession', () => {
  it('[S14] returns the user id and issue time for a token we signed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const token = await signSession(userId);

    expect(await getSession(reader(token))).toEqual({
      userId,
      iat: Math.floor(NOW.getTime() / 1000),
    });
  });

  it('[S14] returns null without a cookie', async () => {
    expect(await getSession(reader(undefined))).toBeNull();
  });

  it('[S14] rejects a token signed with HS512, while the same secret with HS256 is accepted', async () => {
    const accepted = await builder().setExpirationTime('7d').sign(key(SECRET));
    const hs512 = await builder('HS512')
      .setExpirationTime('7d')
      .sign(key(SECRET));

    expect(await getSession(reader(accepted))).not.toBeNull();
    expect(decodeProtectedHeader(hs512).alg).toBe('HS512');
    expect(await getSession(reader(hs512))).toBeNull();
  });

  it('[S14] rejects an unsigned token with alg none', async () => {
    const issued = Math.floor(Date.now() / 1000);
    const payload = { sub: userId, iat: issued, exp: issued + 3600 };
    const unsigned = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(payload)}.`;
    const control = await signSession(userId);

    expect(await getSession(reader(control))).not.toBeNull();
    expect(await getSession(reader(unsigned))).toBeNull();
  });

  it('[S14] rejects a token signed with another secret', async () => {
    const forged = await builder()
      .setExpirationTime('7d')
      .sign(key(OTHER_SECRET));
    const control = await signSession(userId);

    expect(await getSession(reader(control))).not.toBeNull();
    expect(await getSession(reader(forged))).toBeNull();
  });

  it('[S14] rejects a token whose payload was edited after signing', async () => {
    const [header, , signature] = (await signSession(userId)).split('.');
    const issued = Math.floor(Date.now() / 1000);
    const swapped = base64url({
      sub: seedId(1),
      iat: issued,
      exp: issued + 3600,
    });

    expect(await getSession(reader(`${header}.${swapped}.${signature}`))).toBe(
      null,
    );
    expect(await getSession(reader(await signSession(userId)))).not.toBeNull();
  });

  it('[S14] rejects a validly signed token with no expiry', async () => {
    const token = await builder().sign(key(SECRET));

    expect(await getSession(reader(token))).toBeNull();
    expect(await getSession(reader(await signSession(userId)))).not.toBeNull();
  });

  it('[S14] rejects a validly signed token with no subject', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(key(SECRET));

    expect(await getSession(reader(token))).toBeNull();
  });

  it('[S14] rejects a validly signed token with no issue time', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setExpirationTime('7d')
      .sign(key(SECRET));

    expect(await getSession(reader(token))).toBeNull();
  });

  it.each(['abc', 'a.b.c', '', '....'])(
    '[S14] returns null for the malformed token %j',
    async (token) => {
      expect(
        await getSession(reader(await signSession(userId))),
      ).not.toBeNull();
      expect(await getSession(reader(token))).toBeNull();
    },
  );

  it('[S14] accepts a token 6 days 23 hours old and rejects one past 7 days', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const token = await signSession(userId);

    vi.setSystemTime(new Date(NOW.getTime() + 6 * DAY_MS + 23 * 3600 * 1000));
    expect(await getSession(reader(token))).not.toBeNull();

    vi.setSystemTime(new Date(NOW.getTime() + 7 * DAY_MS + 1000));
    expect(await getSession(reader(token))).toBeNull();
  });
});

describe('session cookie', () => {
  it('[S9] is httpOnly, lax, site-wide and lasts 7 days, not secure outside staging and production', () => {
    expect(sessionCookieOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 604800,
    });
  });

  it.each(['staging', 'production'])(
    '[S9] is secure when APP_ENV is %s',
    async (environment) => {
      vi.stubEnv('APP_ENV', environment);
      vi.stubEnv('APP_URL', 'https://natours.invalid');
      vi.resetModules();
      const fresh = await import('@/server/session');

      expect(fresh.sessionCookieOptions().secure).toBe(true);
    },
  );

  it('[S9] sessionCookie names the cookie and carries the token', () => {
    expect(sessionCookie('token-value')).toEqual({
      name: 'natours_session',
      value: 'token-value',
      ...sessionCookieOptions(),
    });
  });

  it('[S9] the logout cookie reuses every option and only empties the value and maxAge', () => {
    expect(expiredSessionCookie()).toEqual({
      name: 'natours_session',
      value: '',
      ...sessionCookieOptions(),
      maxAge: 0,
    });
  });
});
