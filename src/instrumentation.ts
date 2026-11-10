/** Next calls this once when the server starts, never during `next build`. */
export async function register(): Promise<void> {
  // ADR 0010: reading NEXT_RUNTIME here is a documented process.env exception.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { loadConfigOrExit } = await import('./server/config-startup');
  loadConfigOrExit();
}
