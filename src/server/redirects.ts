import 'server-only';

/** Throwaway stub for the RED commit. */
export function safeNext(next: unknown): string {
  return typeof next === 'string' ? '/' : '/';
}
