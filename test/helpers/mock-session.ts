import { SESSION_COOKIE, signSession } from '@/server/session';
import { cookieStore } from './request-context';

/**
 * Makes the next page data function or Server Action run as this user, by
 * putting a real signed session cookie in the mocked `next/headers` store.
 * `null` removes the cookie, so the caller is logged out. Tests call it per test:
 * the store is cleared before each one.
 */
export async function mockSession(
  user: { _id: unknown } | { id: string } | null,
): Promise<void> {
  if (user === null) {
    cookieStore.delete(SESSION_COOKIE);
    return;
  }
  const id = 'id' in user ? user.id : String(user._id);
  cookieStore.set(SESSION_COOKIE, await signSession(id));
}
