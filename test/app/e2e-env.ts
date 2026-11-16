// Playwright's defaults for the app specs (ADR 0030). Every value is a test value that never leaves
// this machine, and each one can be overridden from the shell. The seed and the dev server read the
// same values, so the app and the database agree on the date and on the seed passwords.

/** The port `next dev` listens on for the app specs. */
export const E2E_PORT = 3000;

/** The day the seed rolls against and that the app clock is pinned to (ADR 0023). */
export const PINNED_DAY = '2026-11-08';

const fromShell = (name: string, fallback: string): string =>
  process.env[name] ?? fallback;

export const e2eEnv = {
  APP_ENV: fromShell('APP_ENV', 'ci'),
  APP_URL: fromShell('APP_URL', `http://localhost:${E2E_PORT}`),
  MONGODB_URI: fromShell('MONGODB_URI', 'mongodb://127.0.0.1:27017/natours'),
  SESSION_SECRET: fromShell(
    'SESSION_SECRET',
    'playwright-run-session-secret-0123456789',
  ),
  SEED_USER_PASSWORD: fromShell(
    'SEED_USER_PASSWORD',
    'playwright-run-traveller-pass',
  ),
  SEED_ADMIN_PASSWORD: fromShell(
    'SEED_ADMIN_PASSWORD',
    'playwright-run-admin-passphrase-0123',
  ),
  APP_NOW: fromShell('APP_NOW', `${PINNED_DAY}T10:00:00+05:30`),
  STORAGE_DIR: fromShell('STORAGE_DIR', '.storage'),
} as const;
