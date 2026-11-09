import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { AppError } from '@/server/errors';
import { toSelf, type SelfUser } from '@/server/modules/users/dto';
import { findActiveById } from '@/server/modules/users/service';
import { safeNext } from '@/server/redirects';
import type { Role } from '@/server/roles';
import { getConfig } from './config';

/** The session cookie's name. */
export const SESSION_COOKIE = 'natours_session';

/** Seven days. The token's `exp` and the cookie's `maxAge` both use it (S14). */
export const SESSION_MAX_AGE_SECONDS = 604800;

/** Anything that can read a cookie by name: `request.cookies` or Next's cookie store. */
export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getConfig().SESSION_SECRET);
}

/**
 * The options for setting and for deleting the session cookie (S9). Setting and
 * deleting share them, because a browser only removes a cookie whose attributes match.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: getConfig().isProductionLike,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Signs a session token for a user. The token carries only `sub`, `iat` and
 * `exp`, never a role: the role is read from the database on every request (S14).
 *
 * @param userId - The user's id, which becomes the `sub` claim.
 * @returns The compact HS256 JWT, valid for 7 days.
 */
export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

/**
 * Reads and verifies the session cookie. Only HS256 with our secret is accepted,
 * and `exp`, `iat` and `sub` must all be present (S14, T-01-31).
 *
 * @param cookieSource - Route Handlers pass `request.cookies`; pages and actions
 * pass nothing and the cookie comes from `cookies()`.
 * @returns The user id and the issue time in whole seconds, or null when there
 * is no cookie or the token is invalid, unsigned, expired or malformed. Never throws.
 */
export async function getSession(
  cookieSource?: CookieReader,
): Promise<{ userId: string; iat: number } | null> {
  try {
    const source = cookieSource ?? (await cookies());
    const token = source.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
      requiredClaims: ['exp', 'iat', 'sub'],
    });
    if (typeof payload.sub !== 'string' || typeof payload.iat !== 'number') {
      return null;
    }
    return { userId: payload.sub, iat: payload.iat };
  } catch {
    return null;
  }
}

/** The cookie object for logging in. The caller sets it, as only actions and handlers may. */
export function sessionCookie(token: string) {
  return { name: SESSION_COOKIE, value: token, ...sessionCookieOptions() };
}

/** The cookie object for logging out: the same options with an empty value and `maxAge` 0 (S9). */
export function expiredSessionCookie() {
  return { ...sessionCookie(''), maxAge: 0 };
}

/**
 * The logged-in user, or null. Every call re-reads the user and the role from
 * the database, so a deactivated account or a changed role takes effect on the
 * next request (Key Decision 11, S6). The token only says who the user is.
 *
 * A token is also refused when it was issued before the user's last password
 * change. `iat` is whole seconds and `passwordChangedAt` has milliseconds, so
 * the change is cut to its second first: a token from the same second is
 * accepted, one from an earlier second is not (SEC-18, ADR 0015).
 *
 * @param cookieSource - Route Handlers pass `request.cookies`; pages and actions
 * pass nothing.
 * @returns The user as `{ id, name, email, role, photo }`, or null for no
 * session, an invalid or stale token, or an unknown or deactivated user.
 * @throws AppError SERVICE_UNAVAILABLE when the database is unreachable. An
 * outage is not treated as a logged-out visitor.
 */
export const getCurrentUser = cache(
  async (cookieSource?: CookieReader): Promise<SelfUser | null> => {
    const session = await getSession(cookieSource);
    if (!session) return null;
    const record = await findActiveById(session.userId);
    if (!record) return null;
    if (
      record.passwordChangedAt &&
      session.iat < Math.floor(record.passwordChangedAt.getTime() / 1000)
    ) {
      return null;
    }
    return toSelf(record);
  },
);

/**
 * The logged-in user, or a refusal.
 *
 * @param options - `next` is the page to return to after logging in.
 * @returns The current user.
 * @throws AppError UNAUTHENTICATED with no user and no `next`. With `next`, it
 * redirects to `/login?next=...` instead, using a path that passed `safeNext`.
 */
export async function requireUser(options?: {
  next?: string;
}): Promise<SelfUser> {
  const user = await getCurrentUser();
  if (user) return user;
  if (options?.next !== undefined) {
    redirect(`/login?next=${encodeURIComponent(safeNext(options.next))}`);
  }
  throw new AppError('UNAUTHENTICATED');
}

/**
 * The logged-in user, who must hold one of the listed roles. There is no role
 * hierarchy: an admin is refused unless `admin` is in the list (S6).
 *
 * @param roles - Every role that may pass.
 * @param options - As for `requireUser`.
 * @returns The current user.
 * @throws AppError FORBIDDEN when the user's role is not listed; the errors of
 * `requireUser` when nobody is logged in.
 */
export async function requireRole(
  roles: readonly Role[],
  options?: { next?: string },
): Promise<SelfUser> {
  const user = await requireUser(options);
  if (!roles.includes(user.role)) throw new AppError('FORBIDDEN');
  return user;
}
