import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test } from '@playwright/test';
import { e2eEnv, PINNED_DAY } from './e2e-env';

// ADR 0030 (QA-20, QA-21): the app specs run on known seed data and a known date. This setup resets
// the seed in the database named by MONGODB_URI before the app project starts. It is the only place
// the specs touch the database, and it runs `npm run seed` as a child process, so the seed's own
// guards (APP_ENV, SEC-16 and SEC-27) apply to the run exactly as they do by hand.
const ROOT = path.resolve(import.meta.dirname, '../..');

test('seed the database for the app specs', () => {
  test.setTimeout(180_000);
  // stdio is inherited so a broken seed rule prints its name in the Playwright output.
  execFileSync(
    'npm',
    ['run', 'seed', '--', '--reset', `--today=${PINNED_DAY}`],
    {
      cwd: ROOT,
      env: { ...process.env, ...e2eEnv },
      stdio: 'inherit',
    },
  );
});
