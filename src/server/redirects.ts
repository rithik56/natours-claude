import 'server-only';

const MAX_LENGTH = 2048;
const ORIGIN = 'http://natours.invalid';

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Returns `next` only when it is a same-site path, otherwise `/` (S22).
 *
 * A post-login redirect target comes from the query string, so it is
 * attacker-controlled. Only a path with a single leading slash, no backslash
 * and no control character is accepted, and it must still resolve to this
 * origin.
 *
 * @param next - The requested target, of any type.
 * @returns The same string when safe; `/` for anything else.
 */
export function safeNext(next: unknown): string {
  if (typeof next !== 'string' || next.length > MAX_LENGTH) return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  if (next.includes('\\') || hasControlCharacter(next)) return '/';
  if (!URL.canParse(next, ORIGIN)) return '/';
  return new URL(next, ORIGIN).origin === ORIGIN ? next : '/';
}
