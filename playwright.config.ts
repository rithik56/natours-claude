import { defineConfig, devices } from '@playwright/test';
import { E2E_PORT, e2eEnv } from './test/app/e2e-env';

const port = E2E_PORT;

/**
 * Three projects share one config.
 *
 * mockups: captures the design-gate mockups (docs/design/mockups/*.html) as
 * static screenshots. Not part of the Next.js app, see plan.md §9.7 step 3.
 * It needs no database, so it does not depend on the seed.
 *
 * seed: resets the seed data in the database and pins the clock's date
 * (test/app/seed-setup.ts, ADR 0030). The app project waits for it.
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
      name: 'seed',
      testDir: 'test/app',
      testMatch: 'seed-setup.ts',
    },
    {
      name: 'app',
      testDir: 'test/app',
      testMatch: '**/*.spec.ts',
      dependencies: ['seed'],
      use: { baseURL: `http://localhost:${port}` },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${port}/healthz`,
    reuseExistingServer: true,
    timeout: 120_000,
    // Test-only values from test/app/e2e-env.ts, used when the shell sets none. They never leave this machine.
    env: {
      PORT: String(port),
      ...e2eEnv,
    },
  },
});
