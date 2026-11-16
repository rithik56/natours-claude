import { pathToFileURL } from 'node:url';
import { fromIstDay } from '@/lib/ist';
import { disconnectDb } from '@/server/db';
import { runSeed } from './seed/run';

export type SeedArgs = { reset: boolean; today: string | undefined };

/**
 * Reads the seed flags. `--reset` wipes the seed data first, and `--today=YYYY-MM-DD` is a real
 * calendar day (it is wired into the date roll in a later plan). Any other argument is an error.
 */
export function parseSeedArgs(argv: readonly string[]): SeedArgs {
  let reset = false;
  let today: string | undefined;
  for (const arg of argv) {
    if (arg === '--reset') {
      reset = true;
    } else if (arg.startsWith('--today=')) {
      today = arg.slice('--today='.length);
      // Throws RangeError unless the value is a real YYYY-MM-DD day.
      fromIstDay(today);
    } else {
      throw new Error(`unknown argument ${arg}`);
    }
  }
  return { reset, today };
}

/** Loads .env.local for the seed. A missing file is fine, and values already in the environment win. */
function loadLocalEnv(): void {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // No .env.local: the environment alone is used.
  }
}

async function main(): Promise<void> {
  loadLocalEnv();
  const args = parseSeedArgs(process.argv.slice(2));
  try {
    await runSeed({ reset: args.reset });
    process.stdout.write('seed: done\n');
  } finally {
    await disconnectDb();
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `seed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
