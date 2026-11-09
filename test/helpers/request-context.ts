type CookieOptions = Record<string, unknown>;
type StoredCookie = { name: string; value: string };

const cookies = new Map<string, string>();

/** Stands in for the store `cookies()` returns from `next/headers` in a Server Action or page. */
export const cookieStore = {
  get(name: string): StoredCookie | undefined {
    const value = cookies.get(name);
    return value === undefined ? undefined : { name, value };
  },
  getAll(): StoredCookie[] {
    return [...cookies].map(([name, value]) => ({ name, value }));
  },
  has(name: string): boolean {
    return cookies.has(name);
  },
  set(
    nameOrCookie: string | { name: string; value: string },
    value?: string,
    options?: CookieOptions,
  ): void {
    void options;
    if (typeof nameOrCookie === 'string') {
      cookies.set(nameOrCookie, value ?? '');
    } else {
      cookies.set(nameOrCookie.name, nameOrCookie.value);
    }
  },
  delete(name: string): void {
    cookies.delete(name);
  },
};

/** Stands in for the headers `headers()` returns. Holds the request ID the logger reads. */
export const requestHeaders = new Headers();

/** Clears the cookies and gives the next test a fresh request ID. */
export function resetRequestContext(): void {
  cookies.clear();
  requestHeaders.set('x-request-id', crypto.randomUUID());
}

resetRequestContext();
