import { defineConfig, devices } from '@playwright/test';

const port = 3000;

/**
 * Two projects share one config.
 *
 * mockups: captures the design-gate mockups (docs/design/mockups/*.html) as
 * static screenshots. Not part of the Next.js app, see plan.md §9.7 step 3.
 *
 * app: drives the real app in a browser. Plan 03-01 sets this up so every
 * interactive ui/ component (mobile menu, star rating input, confirm dialog,
 * file input, toast) can test its behaviour on /styleguide against a real
 * `next dev` server, without adding jsdom or Testing Library. The specs sit
 * beside the Vitest tests in test/app, so testMatch keeps the two runners apart.
 */
export default defineConfig({
  fullyParallel: true,
  use: {
    ...devices['Desktop Chrome'],
    // DES-10: the route-line signature element must not be mid-draw in a screenshot.
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'mockups',
      testDir: 'test/design',
      testMatch: '**/*.spec.ts',
    },
    {
      name: 'app',
      testDir: 'test/app',
      testMatch: '**/*.spec.ts',
      use: { baseURL: `http://localhost:${port}` },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${port}/healthz`,
    reuseExistingServer: true,
    timeout: 120_000,
    // Test-only values, used when the shell and .env.local set none. They never leave this machine.
    env: {
      PORT: String(port),
      APP_ENV: process.env.APP_ENV ?? 'ci',
      APP_URL: process.env.APP_URL ?? `http://localhost:${port}`,
      MONGODB_URI:
        process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/natours',
      SESSION_SECRET:
        process.env.SESSION_SECRET ??
        'playwright-run-session-secret-0123456789',
    },
  },
});
