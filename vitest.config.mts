import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // server-only throws outside React Server rendering, so tests get the package's own empty module.
      'server-only': path.resolve(
        import.meta.dirname,
        'node_modules/server-only/empty.js',
      ),
    },
  },
  test: {
    // TZ=UTC makes the IST date tests meaningful: the server must not rely on the local zone.
    env: {
      TZ: 'UTC',
      APP_ENV: 'test',
      APP_URL: 'http://localhost:3000',
      // Test-only value, 32 or more characters, never used outside the test run.
      SESSION_SECRET: 'test-run-session-secret-0123456789abcdef',
    },
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    // test/design/*.spec.ts runs under @playwright/test, not Vitest (02-01-PLAN.md).
    exclude: ['**/node_modules/**', 'test/design/**'],
    coverage: {
      provider: 'v8',
      include: ['src/server/**/*.ts'],
      exclude: ['src/server/adapters/real-*.ts'],
      thresholds: {
        lines: 75,
        'src/server/modules/**/service.ts': { lines: 85, perFile: true },
      },
    },
  },
});
