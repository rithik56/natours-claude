import 'server-only';
import { AppError } from '@/server/errors';
import type { SelfUser } from '@/server/modules/users/dto';
import type { Role } from '@/server/roles';
import { getCurrentUser, type CookieReader } from '@/server/session';

/**
 * What a route or action declares about who may call it (SEC-15). There is no
 * default: a route that declares nothing is refused.
 *
 * - `public`: anyone, signed in or not.
 * - `auth`: any signed-in user.
 * - `owner`: a signed-in user; the service then checks the record is theirs.
 *   It is its own value so the Phase 6 access matrix can tell the routes apart.
 * - `{ roles }`: a signed-in user holding one of the listed roles, exactly. An
 *   admin is not waved through a list that leaves `admin` out (S6).
 */
export type Access = 'public' | 'auth' | 'owner' | { roles: readonly Role[] };

function isRoleAccess(access: unknown): access is { roles: readonly Role[] } {
  return (
    typeof access === 'object' &&
    access !== null &&
    Array.isArray((access as { roles?: unknown }).roles)
  );
}

// The user comes only from getCurrentUser (plan 01-09). It rethrows a database
// outage, which must reach the caller as 503 and not look like a logged-out visitor.
async function signedIn(cookieSource: CookieReader | undefined) {
  const user = await getCurrentUser(cookieSource);
  if (!user) throw new AppError('UNAUTHENTICATED');
  return user;
}

/**
 * Checks a declared access level for one request.
 *
 * @param access - The route's declaration. `undefined`, or any value that is
 * not one of the allowed shapes, is refused: the pipeline fails closed.
 * @param cookieSource - Route Handlers pass `request.cookies`.
 * @returns The signed-in user, or null for a `public` route (the session is not read).
 * @throws AppError FORBIDDEN for a missing or unknown declaration or a role not listed;
 * UNAUTHENTICATED when a signed-in user is needed and there is none;
 * SERVICE_UNAVAILABLE when the database cannot be reached.
 */
export async function resolveAccess(
  access: Access | undefined,
  cookieSource?: CookieReader,
): Promise<SelfUser | null> {
  if (access === 'public') return null;
  if (access === 'auth' || access === 'owner') {
    return signedIn(cookieSource);
  }
  if (isRoleAccess(access)) {
    const user = await signedIn(cookieSource);
    if (!access.roles.includes(user.role)) throw new AppError('FORBIDDEN');
    return user;
  }
  throw new AppError('FORBIDDEN');
}
