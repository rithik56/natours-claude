import 'server-only';
import type { CookieReader } from '@/server/session';
import type { SelfUser } from '@/server/modules/users/dto';
import type { Role } from '@/server/roles';

/** What a route or action declares about who may call it (SEC-15). */
export type Access = 'public' | 'auth' | 'owner' | { roles: readonly Role[] };

// Throwaway RED stub: lets everyone in.
export async function resolveAccess(
  access: Access | undefined,
  cookieSource?: CookieReader,
): Promise<SelfUser | null> {
  void access;
  void cookieSource;
  return null;
}
