import { defineConfig, devices } from '@playwright/test';

/**
 * Captures the design-gate mockups (docs/design/mockups/*.html) as static
 * screenshots. Not part of the Next.js app — see plan.md §9.7 step 3.
 */
export default defineConfig({
  testDir: 'test/design',
  fullyParallel: true,
  use: {
    ...devices['Desktop Chrome'],
    // DES-10: the route-line signature element must not be mid-draw in a screenshot.
    reducedMotion: 'reduce',
  },
});
