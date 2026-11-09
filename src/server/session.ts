import 'server-only';

export const SESSION_COOKIE = 'natours_session';
export const SESSION_MAX_AGE_SECONDS = 604800;

export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

// Throwaway stubs for the RED commit: neutral wrong values, replaced at GREEN.
export function sessionCookieOptions() {
  return {
    httpOnly: false,
    secure: false,
    sameSite: 'strict' as const,
    path: '/x',
    maxAge: 0,
  };
}

export async function signSession(userId: string): Promise<string> {
  return Promise.resolve(userId === '' ? 'x' : '');
}

export async function getSession(
  cookieSource?: CookieReader,
): Promise<{ userId: string; iat: number } | null> {
  return Promise.resolve(cookieSource === undefined ? null : null);
}

export function sessionCookie(token: string) {
  return { name: SESSION_COOKIE, value: token, ...sessionCookieOptions() };
}

export function expiredSessionCookie() {
  return { name: SESSION_COOKIE, ...sessionCookieOptions(), value: 'x' };
}
